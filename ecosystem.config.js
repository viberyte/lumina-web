module.exports = {
  apps: [
    {
      name: 'lumina-web',
      script: 'npm',
      args: 'start',
      cwd: '/opt/viberyte/lumina-web',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    },
    {
      name: 'event-scraper',
      script: 'scripts/scrapers/all-events-scraper.js',
      cwd: '/opt/viberyte/lumina-web',
      instances: 1,
      autorestart: false,
      cron_restart: '0 3 * * *', // Run at 3 AM daily
      watch: false
    }
  ]
};
