// Vitest global setup: one shared in-memory MongoDB for the entire test run.
import fs from 'node:fs';
import path from 'node:path';

export default async function globalSetup() {
  // Env for the whole run is set here so app + services see consistent config.
  process.env.NODE_ENV = 'test';
  process.env.SESSION_SECRET = 'test-session-secret-for-vitest-only-value';
  process.env.UPLOAD_DIR = path.join(process.cwd(), '.test-uploads');
  process.env.EMAIL_ADAPTER = 'dev';
  fs.mkdirSync(process.env.UPLOAD_DIR, { recursive: true });
  return async () => {
    fs.rmSync(process.env.UPLOAD_DIR, { recursive: true, force: true });
  };
}
