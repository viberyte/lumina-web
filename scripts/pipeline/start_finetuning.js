import OpenAI from 'openai';
import fs from 'fs';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function startFineTuning() {
  console.log('📤 Uploading training dataset...');
  
  // Upload file
  const file = await openai.files.create({
    file: fs.createReadStream('lumina_finetuning_dataset.jsonl'),
    purpose: 'fine-tune'
  });
  
  console.log(`✅ File uploaded! ID: ${file.id}`);
  
  // Create fine-tuning job
  console.log('🧠 Starting fine-tuning job...');
  const fineTune = await openai.fineTuning.jobs.create({
    training_file: file.id,
    model: 'gpt-4o-mini-2024-07-18',
    suffix: 'lumina-nightlife-v1'
  });
  
  console.log(`✅ Fine-tuning started!`);
  console.log(`   Job ID: ${fineTune.id}`);
  console.log(`   Status: ${fineTune.status}`);
  console.log(`\n📊 Monitor progress:`);
  console.log(`   https://platform.openai.com/finetune/${fineTune.id}`);
  console.log(`\n⏱️  Estimated time: 1-2 hours for 2,047 examples`);
  console.log(`💰 Cost: ~$4-8 for fine-tuning`);
  console.log(`\n🎯 Once complete, your model will be: ft:gpt-4o-mini-2024-07-18:lumina-nightlife-v1:${fineTune.id}`);
}

startFineTuning().catch(console.error);
