import { execSync } from 'child_process';

console.log('Starting Apify V2 with STOP condition...\n');

try {
  execSync('node /opt/viberyte/lumina-web/scripts/parse-apify-menus-fixed-v2.js', {
    stdio: 'inherit',
    cwd: '/opt/viberyte/lumina-web'
  });
  console.log('\n✅ Extraction complete - STOPPED!');
} catch (error) {
  console.error('\n❌ Extraction failed:', error.message);
  process.exit(1);
}
