module.exports = {
  apps: [
    {
      name: 'lumina-web',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3000',
      cwd: '/opt/viberyte/lumina-web',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        OPENAI_API_KEY: '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',
        GOOGLE_PLACES_API_KEY: 'AIzaSyDz4lysVaUARLr3WSl0nqKvCuRmMd58_Rs'
      }
    },
    {
      name: 'venue-processor',
      script: '/opt/viberyte/lumina-web/scripts/master-venue-processor.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: false,
      env: {
        NODE_ENV: 'production',
        GOOGLE_PLACES_API_KEY: 'AIzaSyDz4lysVaUARLr3WSl0nqKvCuRmMd58_Rs',
        OPENAI_API_KEY: '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'
      }
    }
  ]
};
