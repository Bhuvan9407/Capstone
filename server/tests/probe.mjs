import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';

process.env.NODE_ENV = 'test';
process.env.MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/probe';
process.env.SESSION_SECRET = 'x'.repeat(48);

const mem = await MongoMemoryServer.create();
process.env.MONGO_URI = mem.getUri('probe-db');
const { connectMongo } = await import('../src/config/index.js');
await connectMongo();
const { createApp } = await import('../src/app.js');
const app = createApp();

const health = await request(app).get('/api/health');
console.log('health:', health.status);

const unauth = await request(app).get('/api/evidence');
console.log('unauth GET /api/evidence:', unauth.status, JSON.stringify(unauth.body));

const reg = await request(app).post('/api/auth/register').send({
  name: 'Probe User',
  email: 'probe@example.test',
  password: 'ProbePass1',
});
console.log('register:', reg.status, JSON.stringify(reg.body));

const inbox = await request(app).get('/api/auth/dev-inbox');
console.log('inbox status:', inbox.status, 'items:', inbox.body.items?.length);
const mail = inbox.body.items?.[0];
console.log('first mail:', mail ? JSON.stringify(mail).slice(0, 300) : 'none');

if (mail) {
  const token = mail.actionUrl?.split('token=')[1];
  const ver = await request(app).post('/api/auth/verify-email').send({ token });
  console.log('verify:', ver.status, JSON.stringify(ver.body));
  const login = await request(app).post('/api/auth/login').send({ email: 'probe@example.test', password: 'ProbePass1' });
  console.log('login:', login.status, JSON.stringify(login.body).slice(0, 200));
  const setCookies = login.headers['set-cookie'] || [];
  console.log('cookies:', setCookies);
  const sid = setCookies.map((c) => c.split(';')[0]).find((c) => c.startsWith('coach_sid='));
  // fetch csrf cookie via GET
  const g = await request(app).get('/api/auth/me').set('Cookie', sid);
  const csrf = (g.headers['set-cookie'] || []).map((c) => c.split(';')[0]).find((c) => c.startsWith('coach_csrf='));
  const tokenCsrf = decodeURIComponent(csrf?.split('=')[1] || '');
  console.log('csrf cookie found:', Boolean(csrf));
  const ev = await request(app)
    .post('/api/evidence')
    .set('Cookie', `${sid}; ${csrf}`)
    .set('X-CSRF-Token', tokenCsrf)
    .send({ kind: 'project', title: 'Probe project' });
  console.log('create evidence:', ev.status, JSON.stringify(ev.body).slice(0, 300));
}

await mongoose.disconnect();
await mem.stop();
