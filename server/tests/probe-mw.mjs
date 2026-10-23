process.env.NODE_ENV = 'test';
process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/probe3';
process.env.SESSION_SECRET = 'x'.repeat(48);

const mod = await import('../src/middleware/auth.js');
console.log('exports:', Object.keys(mod));
const req = { cookies: {}, path: '/api/evidence' };
const res = {};
await mod.requireAuth(req, res, (err) => {
  console.log('next called with err:', err ? `${err.status} ${err.message}` : 'null');
  console.log('req.user:', req.user);
});
