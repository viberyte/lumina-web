import Database from 'better-sqlite3';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

const DB_PATH = '/opt/viberyte/lumina-web/data/lumina.db';
const VIDEO_DIR = '/mnt/volume_nyc1_01/tiktok-videos';
const FRAMES_DIR = '/tmp/tiktok-frames';
const OPENAI_API_KEY = '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';
const FINE_TUNED_MODEL = 'ft:gpt-4o-mini-2024-07-18:viberyte:lumina-nightlife-v1:Cl4g83K2';

const db = new Database(DB_PATH);

// Create frames directory
if (!fs.existsSync(FRAMES_DIR)) {
  fs.mkdirSync(FRAMES_DIR, { recursive: true });
}

async function extractFrames(videoPath, outputDir, numFrames = 5) {
  const framePattern = path.join(outputDir, 'frame_%03d.jpg');
  
  try {
    await execPromise(
      `ffmpeg -i "${videoPath}" -vf "select='not(mod(n\\,${Math.floor(30 / numFrames)}))',scale=720:-1" -vsync vfr -frames:v ${numFrames} "${framePattern}" -y 2>/dev/null`
    );
    
    const frames = fs.readdirSync(outputDir)
      .filter(f => f.startsWith('frame_') && f.endsWith('.jpg'))
      .map(f => path.join(outputDir, f));
    
    return frames;
  } catch (error) {
    return [];
  }
}

function imageToBase64(imagePath) {
  const imageBuffer = fs.readFileSync(imagePath);
  return imageBuffer.toString('base64');
}

async function analyzeFramesWithAI(framePaths, videoMetadata) {
  const images = framePaths.map(framePath => ({
    type: "image_url",
    image_url: {
      url: `data:image/jpeg;base64,${imageToBase64(framePath)}`
    }
  }));

  const prompt = `Analyze these ${framePaths.length} frames from a TikTok video of a nightlife venue.

Video Caption: "${videoMetadata.caption}"
Duration: ${videoMetadata.duration}s
Views: ${videoMetadata.views.toLocaleString()}
Likes: ${videoMetadata.likes.toLocaleString()}

Extract PRECISE nightlife intelligence in JSON format:

{
  "crowd_analysis": {
    "density": "empty" | "sparse" | "moderate" | "packed" | "overcrowded",
    "estimated_count": number,
    "age_breakdown": {
      "young_crowd_18_24": percentage (0-100),
      "mid_twenties_25_29": percentage (0-100),
      "early_thirties_30_37": percentage (0-100),
      "mature_crowd_38_plus": percentage (0-100),
      "dominant_age_group": "18-24" | "25-29" | "30-37" | "38+"
    },
    "gender_ratio": {
      "male_percentage": 0-100,
      "female_percentage": 0-100,
      "assessment": "mostly_male" | "mostly_female" | "balanced"
    },
    "group_composition": ["solo", "couples", "small_groups_3_5", "large_groups_6_plus"],
    "dress_style": {
      "dominant_style": "streetwear" | "smart_casual" | "cocktail_attire" | "formal" | "mixed",
      "enforcement_visible": "strict" | "moderate" | "relaxed"
    }
  },
  "vibe_analysis": {
    "energy_level": 1-10,
    "atmosphere": "lounge" | "bar" | "club" | "upscale_lounge" | "dive_bar" | "rooftop",
    "lighting": "bright" | "ambient" | "dim" | "dark" | "neon" | "strobes",
    "music_indicators": {
      "dj_visible": boolean,
      "live_performance": boolean,
      "likely_genre": "hiphop" | "house" | "edm" | "top40" | "latin" | "afrobeats" | "reggaeton" | "mixed",
      "sound_system_quality": "basic" | "good" | "premium"
    },
    "dance_floor": {
      "active": boolean,
      "percentage_dancing": 0-100,
      "style": "grinding" | "jumping" | "vibing" | "club_dancing" | "none"
    }
  },
  "venue_intelligence": {
    "visible_features": ["bar", "dj_booth", "vip_section", "dance_floor", "lounge_seating", "outdoor_area", "stage", "bottle_service_tables"],
    "space_type": "intimate_under_100" | "medium_100_300" | "large_300_500" | "mega_500_plus",
    "decor_vibe": "modern_minimalist" | "industrial_warehouse" | "luxury_glam" | "tropical" | "vintage" | "themed",
    "bottle_service_visible": boolean,
    "table_service_active": boolean,
    "coat_check_visible": boolean
  },
  "timing_indicators": {
    "likely_time_of_night": "early_9pm_11pm" | "peak_11pm_1am" | "late_1am_3am" | "after_hours_3am_plus",
    "day_of_week_guess": "weekday" | "friday" | "saturday" | "sunday",
    "is_peak_moment": boolean
  },
  "authenticity_signals": {
    "content_type": "organic_user" | "influencer_promo" | "venue_official" | "professional_shoot",
    "credibility_score": 1-10,
    "crowd_appears_genuine": boolean
  },
  "red_flags": ["overcrowded", "empty", "poor_lighting", "messy", "unsafe_looking", "fake_crowd"],
  "green_flags": ["packed_dance_floor", "diverse_crowd", "high_energy", "upscale_clientele", "professional_service", "premium_space"],
  "key_insights": [
    "One sentence observation 1",
    "One sentence observation 2", 
    "One sentence observation 3"
  ]
}

BE VERY SPECIFIC about age ranges - look at clothing, posture, facial features, and social dynamics. A 38+ crowd looks different from college-aged crowds.`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: FINE_TUNED_MODEL,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              ...images
            ]
          }
        ],
        max_tokens: 2000,
        temperature: 0.2
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(`OpenAI API error: ${JSON.stringify(data)}`);
    }

    const analysisText = data.choices[0].message.content;
    
    const jsonMatch = analysisText.match(/```json\n?(.*?)\n?```/s) || analysisText.match(/(\{.*\})/s);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1]);
    }
    
    return JSON.parse(analysisText);
    
  } catch (error) {
    console.error('AI analysis failed:', error.message);
    return null;
  }
}

async function analyzeVenueVideos(limit = 100) {
  console.log('🎥 Starting AI-powered TikTok video analysis\n');
  console.log(`🤖 Using fine-tuned model: ${FINE_TUNED_MODEL}\n`);
  
  const venues = db.prepare(`
    SELECT id, name, tiktok_videos
    FROM venues
    WHERE tiktok_videos IS NOT NULL 
      AND tiktok_videos != '[]'
      AND tiktok_videos != ''
      AND (tiktok_data IS NULL OR tiktok_data = '')
    LIMIT ?
  `).all(limit);

  console.log(`Found ${venues.length} venues to analyze\n`);

  let totalAnalyzed = 0;
  let totalCost = 0;

  for (const venue of venues) {
    const videos = JSON.parse(venue.tiktok_videos);
    console.log(`\n🏢 ${venue.name} (${videos.length} videos)`);

    const videoAnalyses = [];

    for (let i = 0; i < Math.min(videos.length, 3); i++) {
      const video = videos[i];
      
      if (!video.local_video_path) {
        console.log(`   ⏭️  Video ${i+1}: No local file yet`);
        continue;
      }

      const videoPath = path.join('/mnt/volume_nyc1_01', video.local_video_path);
      
      if (!fs.existsSync(videoPath)) {
        console.log(`   ⏭️  Video ${i+1}: File not found`);
        continue;
      }

      console.log(`   🎬 Analyzing video ${i+1}...`);

      const frameDir = path.join(FRAMES_DIR, `${venue.id}_${video.video_id}`);
      if (!fs.existsSync(frameDir)) {
        fs.mkdirSync(frameDir, { recursive: true });
      }

      const frames = await extractFrames(videoPath, frameDir, 6);
      
      if (frames.length === 0) {
        console.log(`   ❌ Failed to extract frames`);
        continue;
      }

      console.log(`   📸 Extracted ${frames.length} frames`);

      const analysis = await analyzeFramesWithAI(frames, {
        caption: video.caption,
        duration: video.duration,
        views: video.views,
        likes: video.likes
      });

      if (analysis) {
        videoAnalyses.push(analysis);
        totalAnalyzed++;
        totalCost += 0.015;
        
        console.log(`   ✅ Analysis complete`);
        console.log(`      Energy: ${analysis.vibe_analysis?.energy_level}/10`);
        console.log(`      Crowd: ${analysis.crowd_analysis?.density}`);
        console.log(`      Age: ${analysis.crowd_analysis?.age_breakdown?.dominant_age_group}`);
        console.log(`      Vibe: ${analysis.vibe_analysis?.atmosphere}`);
      } else {
        console.log(`   ❌ Analysis failed`);
      }

      fs.rmSync(frameDir, { recursive: true, force: true });

      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    if (videoAnalyses.length > 0) {
      const aggregated = aggregateAnalyses(videoAnalyses);
      
      db.prepare(`
        UPDATE venues 
        SET tiktok_data = ?
        WHERE id = ?
      `).run(JSON.stringify(aggregated), venue.id);

      console.log(`   📊 Saved AI insights`);
    }
  }

  console.log(`\n🎉 Analysis complete!`);
  console.log(`   🎬 Videos analyzed: ${totalAnalyzed}`);
  console.log(`   💰 Estimated cost: $${totalCost.toFixed(2)}`);
  
  db.close();
}

function aggregateAnalyses(analyses) {
  const avgEnergy = analyses.reduce((sum, a) => sum + (a.vibe_analysis?.energy_level || 0), 0) / analyses.length;
  
  const avgMature = analyses.reduce((sum, a) => sum + (a.crowd_analysis?.age_breakdown?.mature_crowd_38_plus || 0), 0) / analyses.length;
  
  const allFeatures = analyses.flatMap(a => a.venue_intelligence?.visible_features || []);
  const featureFreq = {};
  allFeatures.forEach(f => featureFreq[f] = (featureFreq[f] || 0) + 1);
  
  const allGenres = analyses.map(a => a.vibe_analysis?.music_indicators?.likely_genre).filter(Boolean);
  
  return {
    average_energy_level: Math.round(avgEnergy * 10) / 10,
    dominant_age_group: analyses[0]?.crowd_analysis?.age_breakdown?.dominant_age_group,
    mature_crowd_percentage: Math.round(avgMature),
    typical_atmosphere: analyses[0]?.vibe_analysis?.atmosphere,
    confirmed_features: Object.keys(featureFreq).filter(f => featureFreq[f] >= analyses.length / 2),
    likely_music_genres: [...new Set(allGenres)],
    videos_analyzed: analyses.length,
    analyzed_at: new Date().toISOString(),
    raw_analyses: analyses
  };
}

const venueLimit = parseInt(process.argv[2]) || 100;
analyzeVenueVideos(venueLimit);
