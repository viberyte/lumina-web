import sqlite3 from 'sqlite3';
import fs from 'fs';

const DB_PATH = '/opt/viberyte/lumina-web/data/lumina.db';
const HANDLES_FILE = '/opt/viberyte/lumina-web/data/instagram-handles.txt';

const db = new sqlite3.Database(DB_PATH);

async function processVenues() {
  console.log('📊 Processing Instagram venues...\n');

  // Read Instagram handles
  const handles = fs.readFileSync(HANDLES_FILE, 'utf-8')
    .split('\n')
    .filter(h => h.trim())
    .map(h => h.trim());

  console.log(`Found ${handles.length} Instagram handles\n`);

  // Check which ones already exist
  const existing = await new Promise((resolve, reject) => {
    db.all(
      'SELECT instagram_handle FROM venues WHERE instagram_handle IN (' + 
      handles.map(() => '?').join(',') + ')',
      handles,
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows.map(r => r.instagram_handle));
      }
    );
  });

  const newHandles = handles.filter(h => !existing.includes(h));

  console.log(`✅ Already in database: ${existing.length}`);
  console.log(`🆕 New venues to add: ${newHandles.length}\n`);

  // Save lists for reference
  fs.writeFileSync(
    '/opt/viberyte/lumina-web/data/existing-handles.txt',
    existing.join('\n')
  );
  
  fs.writeFileSync(
    '/opt/viberyte/lumina-web/data/new-handles.txt',
    newHandles.join('\n')
  );

  console.log('📝 Saved lists:');
  console.log('   - existing-handles.txt (already in DB)');
  console.log('   - new-handles.txt (need to add)\n');

  // Show sample of new venues
  console.log('🆕 Sample of new venues to add:');
  newHandles.slice(0, 20).forEach(h => console.log(`   @${h}`));
  
  if (newHandles.length > 20) {
    console.log(`   ... and ${newHandles.length - 20} more\n`);
  }

  db.close();
}

processVenues().catch(console.error);
