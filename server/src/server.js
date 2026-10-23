import http from 'node:http';
import { config, requiredConfig, connectMongo } from './config/index.js';
import { createApp } from './app.js';

requiredConfig();

const start = async () => {
  await connectMongo();
  const app = createApp();
  const server = http.createServer(app);
  server.listen(config.port, () => {
    console.log(`[server] API listening on http://localhost:${config.port} (${config.env})`);
  });
  const shutdown = (signal) => {
    console.log(`[server] ${signal} received, shutting down`);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 5000).unref();
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
};

start().catch((err) => {
  console.error('[server] fatal startup error:', err.message);
  process.exit(1);
});
