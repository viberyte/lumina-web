module.exports = {
  apps: [
    {
      name: "weekly-event-pipeline",
      script: "/opt/viberyte/lumina-web/scripts/weekly-events-pipeline.sh",
      interpreter: "bash",
      cron_restart: "0 4 * * 2", // every Tuesday at 4 AM
      autorestart: false,
      watch: false,
      env: {
        NODE_ENV: "production"
      },
      out_file: "/opt/viberyte/logs/weekly-event-pipeline.log",
      error_file: "/opt/viberyte/logs/weekly-event-pipeline-error.log"
    }
  ]
};
