const https = require('https');
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const db = new Database('/opt/viberyte/lumina-web/data/lumina.db');
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const COVER_DIR = '/mnt/HC_Volume_104366905/tiktok-covers';
const BATCH_SIZE = parseInt(process.env.BATCH_SIZE || '10');

if (!OPENAI_API_KEY) {
  console.error('ERROR: Set OPENAI_API_KEY environment variable');
  process.exit(1);
}

// Get unverified venues
const venues = db.prepare(`
  SELECT DISTINCT v.id, v.name, v.category, v.address
  FROM venues v
  JOIN venue_tiktok_videos t ON v.id = t.venue_id
  WHERE t.is_verified = 0
  ORDER BY v.id
  LIMIT ?
`).all(BATCH_SIZE);

console.log(`Processing ${venues.length} venues...\n`);

function callOpenAI(messages) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      model: 'gpt-4o-mini',
      messages,
      max_tokens: 1000
    });

    const options = {
      hostname: 'api.openai.com',
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Length': Buffer.byteLength(data)
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          if (parsed.error) {
            reject(new Error(parsed.error.message));
          } else {
            resolve(parsed);
          }
        } catch (e) {
          reject(new Error('Failed to parse response: ' + body.substring(0, 200)));
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function imageToBase64(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    const data = fs.readFileSync(filePath);
    return data.toString('base64');
  } catch (e) {
    return null;
  }
}

async function verifyVenue(venue) {
  const videos = db.prepare(`
    SELECT id, tiktok_id, cover_path 
    FROM venue_tiktok_videos 
    WHERE venue_id = ? AND is_verified = 0
    LIMIT 10
  `).all(venue.id);

  if (videos.length === 0) return { passed: 0, failed: 0 };

  console.log(`Verifying: ${venue.name} (${videos.length} videos)`);

  // Build image content for GPT-4 Vision
  const imageContents = [];
  const validVideos = [];

  for (let i = 0; i < videos.length; i++) {
    const coverFileName = path.basename(videos[i].cover_path || `${venue.id}_${videos[i].tiktok_id}.jpg`);
    const coverFile = path.join(COVER_DIR, coverFileName);
    const base64 = imageToBase64(coverFile);
    
    if (base64) {
      imageContents.push({
        type: 'image_url',
        image_url: {
          url: `data:image/jpeg;base64,${base64}`,
          detail: 'low'
        }
      });
      validVideos.push({ ...videos[i], index: imageContents.length });
    }
  }

  if (imageContents.length === 0) {
    console.log('  No valid covers found, marking as failed');
    const updateStmt = db.prepare(`UPDATE venue_tiktok_videos SET is_verified = 0, ai_score = 0, ai_reason = 'No cover image' WHERE id = ?`);
    videos.forEach(v => updateStmt.run(v.id));
    return { passed: 0, failed: videos.length };
  }

  const prompt = `You are verifying TikTok videos for a nightlife venue database.

VENUE: "${venue.name}"
TYPE: ${venue.category || 'nightclub/bar/restaurant'}
ADDRESS: ${venue.address || 'New York area'}

I'm showing you ${imageContents.length} TikTok video thumbnails.

For EACH image (numbered 1-${imageContents.length}), determine if it could plausibly show:
- This venue's interior, exterior, crowd, food, drinks, or events
- A nightlife/dining scene that matches this type of venue
- Content a patron might post from visiting this venue

REJECT images showing:
- Medical/surgical content
- Political content
- Animals/pets (unless it's clearly a pet-friendly bar)
- Random unrelated personal content
- Different venue with visible different name

Be LENIENT - if it COULD be venue content, PASS it.

Respond with ONLY this format (one line per image, no extra text):
1: PASS - reason
2: FAIL - reason
...`;

  const messages = [
    {
      role: 'user',
      content: [
        { type: 'text', text: prompt },
        ...imageContents
      ]
    }
  ];

  let passed = 0, failed = 0;

  try {
    const response = await callOpenAI(messages);
    const content = response.choices?.[0]?.message?.content || '';
    
    console.log('  AI:', content.split('\n')[0]);

    // Parse response and update database
    const updateStmt = db.prepare(`
      UPDATE venue_tiktok_videos 
      SET is_verified = ?, ai_score = ?, ai_reason = ?
      WHERE id = ?
    `);

    for (const video of validVideos) {
      // Find line starting with this index
      const regex = new RegExp(`^${video.index}:\\s*(PASS|FAIL)\\s*[-–]?\\s*(.*)`, 'im');
      const match = content.match(regex);
      
      if (match) {
        const isPassed = match[1].toUpperCase() === 'PASS';
        const reason = match[2]?.trim() || (isPassed ? 'Approved by AI' : 'Rejected by AI');
        updateStmt.run(isPassed ? 1 : 0, isPassed ? 80 : 20, reason.substring(0, 200), video.id);
        if (isPassed) passed++; else failed++;
      } else {
        // Default to pass if we can't parse (be lenient)
        updateStmt.run(1, 60, 'Could not parse AI response, defaulting to approved', video.id);
        passed++;
      }
    }
    
    console.log(`  Results: ${passed} passed, ${failed} failed\n`);

  } catch (error) {
    console.error('  API Error:', error.message);
    // On error, don't update - leave for retry
  }

  return { passed, failed };
}

async function main() {
  let totalPassed = 0, totalFailed = 0;
  
  for (const venue of venues) {
    const result = await verifyVenue(venue);
    totalPassed += result.passed;
    totalFailed += result.failed;
    // Small delay to avoid rate limits
    await new Promise(r => setTimeout(r, 1000));
  }

  const verified = db.prepare('SELECT COUNT(*) as c FROM venue_tiktok_videos WHERE is_verified = 1').get();
  const unverified = db.prepare('SELECT COUNT(*) as c FROM venue_tiktok_videos WHERE is_verified = 0').get();
  
  console.log(`\n=== Summary ===`);
  console.log(`This batch: ${totalPassed} passed, ${totalFailed} failed`);
  console.log(`Total verified: ${verified.c}`);
  console.log(`Total unverified: ${unverified.c}`);
  
  db.close();
}

main().catch(console.error);
