import Database from 'better-sqlite3';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

const DB_PATH = '/opt/viberyte/lumina-web/data/lumina.db';
const VIDEO_DIR = '/mnt/HC_Volume_104366905/tiktok-videos';  // CORRECTED PATH
const COVER_DIR = '/mnt/HC_Volume_104366905/tiktok-covers';  // CORRECTED PATH

const db = new Database(DB_PATH);

if (!fs.existsSync(VIDEO_DIR)) fs.mkdirSync(VIDEO_DIR, { recursive: true });
if (!fs.existsSync(COVER_DIR)) fs.mkdirSync(COVER_DIR, { recursive: true });

async function downloadFile(url, filepath) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  
  const buffer = await response.buffer();
  fs.writeFileSync(filepath, buffer);
  return filepath;
}

async function downloadVenueVideos() {
  console.log('📥 Downloading TikTok videos to local storage\n');
  console.log(`📂 Target: ${VIDEO_DIR}\n`);
  
  const venues = db.prepare(`
    SELECT id, name, tiktok_videos
    FROM venues
    WHERE tiktok_videos IS NOT NULL 
      AND tiktok_videos != '[]'
      AND tiktok_videos != ''
  `).all();

  console.log(`Found ${venues.length} venues with videos\n`);

  let totalDownloaded = 0;
  let totalSize = 0;
  let failed = 0;
  let alreadyDownloaded = 0;

  for (const venue of venues) {
    const videos = JSON.parse(venue.tiktok_videos);
    console.log(`\n🏢 ${venue.name} (${videos.length} videos)`);

    let updated = false;

    for (let i = 0; i < videos.length; i++) {
      const video = videos[i];
      
      if (!video.download_url) {
        continue;
      }

      const videoFilename = `${venue.id}_${video.video_id}.mp4`;
      const coverFilename = `${venue.id}_${video.video_id}.jpg`;
      const videoPath = path.join(VIDEO_DIR, videoFilename);
      const coverPath = path.join(COVER_DIR, coverFilename);

      if (fs.existsSync(videoPath)) {
        video.local_video_path = `/tiktok-videos/${videoFilename}`;
        video.local_cover_path = `/tiktok-covers/${coverFilename}`;
        alreadyDownloaded++;
        continue;
      }

      try {
        await downloadFile(video.download_url, videoPath);
        const videoStats = fs.statSync(videoPath);
        totalSize += videoStats.size;
        
        if (video.cover_url) {
          try {
            await downloadFile(video.cover_url, coverPath);
          } catch (e) {}
        }

        video.local_video_path = `/tiktok-videos/${videoFilename}`;
        video.local_cover_path = `/tiktok-covers/${coverFilename}`;
        
        totalDownloaded++;
        updated = true;
        
        if (totalDownloaded % 10 === 0) {
          console.log(`   ✅ Downloaded ${totalDownloaded} videos so far...`);
        }
        
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        failed++;
      }
    }

    if (updated) {
      db.prepare(`UPDATE venues SET tiktok_videos = ? WHERE id = ?`)
        .run(JSON.stringify(videos), venue.id);
    }
  }

  console.log(`\n🎉 Download complete!`);
  console.log(`   ✅ Downloaded: ${totalDownloaded}`);
  console.log(`   ♻️  Already had: ${alreadyDownloaded}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   💾 Total size: ${(totalSize / 1024 / 1024 / 1024).toFixed(2)} GB`);
  
  db.close();
}

downloadVenueVideos();
