module.exports = {
  apps: [
    {
      name: 'fitness-booking-api',
      script: 'server/dist/index.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
      },
      error_file: '/var/log/fitness-booking/error.log',
      out_file: '/var/log/fitness-booking/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
  ],
};
