// PM2 Ecosystem Config — Run with: pm2 start ecosystem.config.js
module.exports = {
  apps: [{
    name        : 'mediplix-backend',
    script      : 'server.js',
    instances   : 'max',        // Use ALL available CPU cores
    exec_mode   : 'cluster',    // Share port across all workers
    watch       : false,
    max_memory_restart: '512M', // Restart a worker if it leaks memory
    env: {
      NODE_ENV: 'production',
      PORT    : 5000
    },
    // Auto-restart on crash
    autorestart : true,
    // Restart if no response for 30s
    kill_timeout: 30000,
    // Graceful reload — zero downtime deploys
    wait_ready  : true,
    listen_timeout: 10000,
    // Log management
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    error_file  : './logs/pm2-error.log',
    out_file    : './logs/pm2-out.log',
    merge_logs  : true,
  }]
};
