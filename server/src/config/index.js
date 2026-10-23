import 'dotenv/config';
import mongoose from 'mongoose';

const required = (name) => {
  if (!process.env[name]) {
    console.error(`[config] Missing required environment variable: ${name}. See .env.example.`);
    process.exit(1);
  }
  return process.env[name];
};

const num = (name, fallback) => {
  const v = Number(process.env[name]);
  return Number.isFinite(v) && v > 0 ? v : fallback;
};

export const config = {
  env: process.env.NODE_ENV || 'development',
  isDev: (process.env.NODE_ENV || 'development') === 'development',
  isTest: process.env.NODE_ENV === 'test',
  port: num('BACKEND_PORT', 5000),
  publicUrl: process.env.BACKEND_PUBLIC_URL || `http://localhost:${num('BACKEND_PORT', 5000)}`,
  mongoUri: required('MONGO_URI'),
  mongoUriTest: process.env.MONGO_URI_TEST || '',
  frontends: (process.env.FRONTEND_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  session: {
    secret: required('SESSION_SECRET'),
    ttlHours: num('SESSION_TTL_HOURS', 168),
    cookieName: 'coach_sid',
    cookieSecure: (process.env.COOKIE_SECURE || 'false') === 'true',
    cookieSameSite: (process.env.COOKIE_SECURE || 'false') === 'true' ? 'none' : 'lax',
  },
  email: {
    adapter: process.env.EMAIL_ADAPTER || 'dev',
  },
  uploads: {
    dir: process.env.UPLOAD_DIR || './uploads',
    maxSizeMb: num('UPLOAD_MAX_SIZE_MB', 10),
    allowedMime: (process.env.UPLOAD_ALLOWED_MIME || 'application/pdf,text/plain').split(','),
  },
  ollama: {
    baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
    llmModel: process.env.OLLAMA_LLM_MODEL || 'llama3.1:8b',
    embedModel: process.env.OLLAMA_EMBED_MODEL || 'nomic-embed-text',
    timeoutMs: num('OLLAMA_TIMEOUT_MS', 120000),
  },
  retrieval: {
    topK: num('RETRIEVAL_TOP_K', 6),
    chatMaxChunks: num('CHAT_MAX_CHUNKS', 30),
    fallbackKeyword: (process.env.RETRIEVAL_FALLBACK_KEYWORD || 'true') === 'true',
  },
  agent: {
    maxSteps: num('AGENT_MAX_STEPS', 8),
    timeBudgetMs: num('AGENT_TIME_BUDGET_MS', 120000),
  },
};

export const requiredConfig = () => {
  // Validate at startup: secrets must be non-trivial outside of dev/test.
  if (!config.isDev && !config.isTest && config.session.secret.length < 32) {
    console.error('[config] SESSION_SECRET must be at least 32 chars outside development.');
    process.exit(1);
  }
};

export async function connectMongo() {
  if (mongoose.connection.readyState === 1) return mongoose.connection;
  await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 10000 });
  return mongoose.connection;
}
