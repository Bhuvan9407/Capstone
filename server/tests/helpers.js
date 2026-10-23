import { beforeAll, afterAll } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';
import fs from 'node:fs';

process.env.NODE_ENV = 'test';
process.env.SESSION_SECRET = 'x'.repeat(48);
process.env.COOKIE_SECURE = 'false';

let mem;

export const shaCookie = (name, res) => {
  const raw = res.headers['set-cookie']?.find((c) => c.startsWith(name));
  return raw;
};

const helpers = {
  mem,
  app: null,
};

export const registerTestHooks = () =>
  beforeAll(async () => {
    mem = await MongoMemoryServer.create();
    process.env.MONGO_URI = mem.getUri('career-coach-test');
    process.env.FRONTEND_ORIGIN = 'http://localhost:5173';
    const { connectMongo } = await import('../src/config/index.js');
    await connectMongo();
    const { createApp } = await import('../src/app.js');
    helpers.app = createApp();
  }, 180_000);

export const afterTests = () =>
  afterAll(async () => {
    await mongoose.disconnect();
    await mem.stop();
  });

/** csrf pairing helper: obtain GET cookie then echo it back on mutations. */
export const csrfPair = async () => {
  const res = await request(helpers.app).get('/api/health');
  const cookie = res.headers['set-cookie'].find((c) => c.startsWith('coach_csrf='));
  const token = decodeURIComponent(cookie.split(';')[0].split('=')[1]);
  return { cookie: cookie.split(';')[0], token };
};

export const newStudent = async ({ index = 0, name = 'Test Student', email } = {}) => {
  const { app } = helpers;
  const req = request(app);
  const mail = email || `stu${Date.now()}-${index}@example.test`;
  const password = 'TestPass123';
  const reg = await req
    .post('/api/auth/register')
    .send({ name, email: mail, password, institution: 'Demo College' });
  if (reg.status !== 201) throw new Error(`register failed: ${JSON.stringify(reg.body)} ${mail}`);
  const inbox = await request(app).get('/api/auth/dev-inbox');
  const token = inbox.body.items[0]?.actionUrl?.split('token=')[1];
  if (!token) throw new Error('no dev inbox token: ' + JSON.stringify(inbox.body));
  await request(app).post('/api/auth/verify-email').send({ token });
  const login = await request(app).post('/api/auth/login').send({ email: mail, password });
  const sid = (login.headers['set-cookie'] || []).map((c) => c.split(';')[0]).find((c) => c.startsWith('coach_sid='));
  if (!sid) throw new Error('no session cookie after login: ' + JSON.stringify(login.body));
  // GET pairs the readable csrf cookie (double submit) so mutations can echo it.
  const me = await request(app).get('/api/auth/me').set('Cookie', sid);
  const csrfCookie = (me.headers['set-cookie'] || []).map((c) => c.split(';')[0]).find((c) => c.startsWith('coach_csrf='));
  const csrfToken = decodeURIComponent(csrfCookie.split('=')[1]);
  return {
    email: mail,
    password,
    headers: { Cookie: [sid, csrfCookie].join('; '), 'X-CSRF-Token': csrfToken },
    user: login.body.user,
  };
};

export const get = (url, { user } = {}) =>
  request(helpers.app).get(url).set(user?.headers || {});
export const post = (url, body, { user } = {}) =>
  request(helpers.app).post(url).set(user?.headers || {}).send(body);
export const patch = (url, body, { user } = {}) =>
  request(helpers.app).patch(url).set(user?.headers || {}).send(body);
export const del = (url, { user } = {}) =>
  request(helpers.app).delete(url).set(user?.headers || {});
export const upload = (url, filePath, field = 'file', user) =>
  request(helpers.app)
    .post(url)
    .set(user?.headers || {})
    .attach(field, filePath);
export { helpers };
