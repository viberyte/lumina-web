import OpenAI from 'openai';
import fs from 'fs';
import Database from 'better-sqlite3';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const db = new Database('/opt/viberyte/lumina-web/data/lumina.db');

async function checkLuminaAI() {
  console.log('\n🧠 LUMINA AI STATUS\n');
  
  // 1. Check fine-tuning status
  const jobId = 'ftjob-TkuN1J815zr11qBRLSADYXEJ';
  const job = await openai.fineTuning.jobs.retrieve(jobId);
  
  console.log('📊 MODEL STATUS:');
  console.log(`   Status: ${job.status}`);
  console.log(`   Model: ${job.fine_tuned_model || 'Training...'}`);
  
  // 2. Training data size
  const trainingLines = fs.readFileSync('lumina_finetuning_dataset.jsonl', 'utf8').split('\n').filter(Boolean);
  console.log(`\n📚 TRAINING DATA:`);
  console.log(`   Examples: ${trainingLines.length}`);
  
  // 3. Venues enriched
  const venueCount = db.prepare('SELECT COUNT(*) as count FROM venues').get();
  console.log(`\n🏢 VENUES ENRICHED:`);
  console.log(`   Total: ${venueCount.count}`);
  
  // 4. Growth since last check
  const recentVenues = db.prepare(`
    SELECT COUNT(*) as count FROM venues 
    WHERE last_enhanced > datetime('now', '-7 days')
  `).get();
  console.log(`   Last 7 days: +${recentVenues.count}`);
  
  console.log('\n✅ Lumina AI is learning!\n');
}

checkLuminaAI().catch(console.error);
