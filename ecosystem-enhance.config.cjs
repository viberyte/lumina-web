module.exports = {
  apps: [{
    name: 'event-enhancer',
    script: 'scripts/enhance-all-events.js',
    cwd: '/opt/viberyte/lumina-web',
    interpreter: 'node',
    instances: 1,
    autorestart: false,
    watch: false,
    env: {
      NODE_ENV: 'production',
      OPENAI_API_KEY: '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'
    }
  }]
};
