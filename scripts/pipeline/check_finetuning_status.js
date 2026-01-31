import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function checkStatus() {
  const jobId = 'ftjob-TkuN1J815zr11qBRLSADYXEJ';
  
  try {
    const job = await openai.fineTuning.jobs.retrieve(jobId);
    
    console.log(`\n🧠 LUMINA AI STATUS:`);
    console.log(`   Job: ${job.id}`);
    console.log(`   Status: ${job.status}`);
    
    if (job.fine_tuned_model) {
      console.log(`\n✅ MODEL READY!`);
      console.log(`   ${job.fine_tuned_model}`);
    } else {
      console.log(`   ⏳ Still training...`);
    }
  } catch (err) {
    console.log(`❌ Error: ${err.message}`);
  }
}

checkStatus().catch(console.error);
