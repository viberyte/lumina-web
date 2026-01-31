import { ApifyClient } from 'apify-client';
import dotenv from 'dotenv';

dotenv.config();

const client = new ApifyClient({ token: process.env.APIFY_TOKEN });

async function main() {
  const run = await client.run('fAHsCjEJhrEt4ZdsA').get();
  const { items } = await client.dataset(run.defaultDatasetId).listItems();
  
  console.log('\n📊 SAMPLE DATA FROM SCRAPER:\n');
  console.log('Total items:', items.length);
  console.log('\nFirst 3 results:\n');
  console.log(JSON.stringify(items.slice(0, 3), null, 2));
}

main().catch(console.error);
