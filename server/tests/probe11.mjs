import request from 'supertest';
process.env.NODE_ENV = 'test';
process.env.SESSION_SECRET = 'x'.repeat(48);
const { MongoMemoryServer } = await import('mongodb-memory-server');
const mongoose = (await import('mongoose')).default;
const mem = await MongoMemoryServer.create();
process.env.MONGO_URI = mem.getUri('probe11');
const { connectMongo } = await import('../src/config/index.js');
await connectMongo();
const { createApp } = await import('../src/app.js');
const app = createApp();

await request(app).post('/api/auth/register').send({ name: 'CS', email: 'cs@example.test', password: 'CsPass123' });
const inbox = await request(app).get('/api/auth/dev-inbox');
const inboxItems = inbox.body.items;
console.log('inbox length:', inboxItems?.length);
// student emails may appear; pick verify_email
const verify = inboxItems.find((m) => m.actionKind === 'verify_email');
await request(app).post('/api/auth/verify-email').send({ token: verify.actionUrl.split('token=')[1] });
const login = await request(app).post('/api/auth/login').send({ email: 'cs@example.test', password: 'CsPass123' });
const sid = login.headers['set-cookie'].map((c) => c.split(';')[0]).find((c) => c.startsWith('coach_sid='));
const me = await request(app).get('/api/auth/me').set('Cookie', sid);
const csrfCookie = me.headers['set-cookie'].map((c) => c.split(';')[0]).find((c) => c.startsWith('coach_csrf='));
console.log('Cookie header pair:', `${sid}; ${csrfCookie}`);
const c = await request(app).post('/api/evidence').set('Cookie', `${sid}; ${csrfCookie}`).send({ kind: 'project', title: 'Cc' });
console.log('no header:', c.status, JSON.stringify(c.body).slice(0, 140));
await mongoose.disconnect();
await mem.stop();
