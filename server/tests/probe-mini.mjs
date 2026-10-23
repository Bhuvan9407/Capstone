import request from 'supertest';
process.env.NODE_ENV = 'test';
process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/probe2';
process.env.SESSION_SECRET = 'x'.repeat(48);

const { createApp } = await import('../src/app.js');
const app = createApp();

function wrap(fn) {
  return (req, res, next) => {
    if (req.__wrapped !== true) {
      req.__wrapped = true;
      res.setHeader('x-stage', 'outer');
    }
    return fn(req, res, next);
  };
}

const inner = async (req, res, next) => {
  console.log('inner reached, cookies:', JSON.stringify(req.cookies));
  next(new Error('should stop here'));
};

app.get('/probe', wrap(inner), (req, res) => res.json({ reached: 'end' }));
app.use((err, _req, res, _next) => res.status(401).json({ stage: 'error', message: err.message }));

const res = await request(app).get('/probe');
console.log('probe:', res.status, JSON.stringify(res.body), res.headers['x-stage']);
