module.exports = {
  apps: [
    {
      name: 'mess-os-server',
      script: 'dist/server.js',
      node_args: '-r dotenv/config',
      env: {
        NODE_ENV: 'production',
        PORT: 5005,
      },
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '500M',
      error_file: 'logs/err.log',
      out_file: 'logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 4000,
    },
  ],
};
