import request from 'supertest';
process.env.NODE_ENV = 'test';
process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/probe4';
process.env.SESSION_SECRET = 'x'.repeat(48);
process.env.UPLOAD_DIR = 'server/.probe-uploads';
const fs = await import('node:fs');
fs.mkdirSync('server/.probe-uploads', { recursive: true });
const { MongoMemoryServer } = await import('mongodb-memory-server');
const mem = await MongoMemoryServer.create();
process.env.MONGO_URI = mem.getUri('probe4');
const { connectMongo } = await import('../src/config/index.js');
await connectMongo();
const { createApp } = await import('../src/app.js');
const app = createApp();

// setup a verified student
await request(app).post('/api/auth/register').send({ name: 'CS', email: 'cs@example.test', password: 'CsPass123' });
const inbox = await request(app).get('/api/auth/dev-inbox');
await request(app).post('/api/auth/verify-email').send({ token: inbox.body.items[0].actionUrl.split('token=')[1] });
const login = await request(app).post('/api/auth/login').send({ email: 'cs@example.test', password: 'CsPass123' });
const sid = login.headers['set-cookie'].map((c) => c.split(';')[0]).find((c) => c.startsWith('coach_sid='));
const me = await request(app).get('/api/auth/me').set('Cookie', sid);
const csrfCookie = me.headers['set-cookie'].map((c) => c.split(';')[0]).find((c) => c.startsWith('coach_csrf='));
const token = decodeURIComponent(csrfCookie.split('=')[1]);

console.log('sid present:', Boolean(sid), 'csrf:', token.slice(0, 6));

// CASE A: cookie pair ok, NO X-CSRF header
const a = await request(app).post('/api/evidence').set('Cookie', `${sid}; ${csrfCookie}`).send({ kind: 'project', title: 'A' });
console.log('A (no header):', a.status, JSON.stringify(a.body).slice(0, 120));

// CASE B: wrong header
const b = await request(app).post('/api/evidence').set('Cookie', `${sid}; ${csrfCookie}`).set('X-CSRF-Token', 'nope').send({ kind: 'project', title: 'B' });
console.log('B (bad header):', b.status, JSON.stringify(b.body).slice(0, 120));

// CASE C: header ok
const c = await request(app).post('/api/evidence').set('Cookie', `${sid}; ${csrfCookie}`).set('X-CSRF-Token', token).send({ kind: 'project', title: 'C' });
console.log('C (good):', c.status);

// resume upload + reprocess
fs.writeFileSync('server/.probe-uploads/at.txt', 'Alpha text chunk one.\n\nAlpha text chunk two, bigger content to maybe split.');
const up = await request(app).post('/api/resumes').set('Cookie', `${sid}; ${csrfCookie}`).set('X-CSRF-Token', token).attach('file', 'server/.probe-uploads/at.txt');
console.log('upload:', up.status, JSON.stringify(up.body?.resume?.status));
await new Promise((r) => setTimeout(r, 700));
const rep = await request(app).post(`/api/resumes/${up.body.resume.id}/reprocess`).set('Cookie', `${sid}; ${csrfCookie}`).set('X-CSRF-Token', token).send({});
console.log('reprocess:', rep.status, JSON.stringify(rep.body).slice(0, 200));

await mongoose.disconnect();
await mem.stop();
async function noop() {}
const mongoose = (await import('mongoose')).default;
