import { MongoMemoryServer } from 'mongodb-memory-server';
process.env.NODE_ENV = 'test';
process.env.SESSION_SECRET = 'x'.repeat(48);
const mem = await MongoMemoryServer.create();
process.env.MONGO_URI = mem.getUri('seed-validate');
const { seedAll } = await import('../scripts/seed.js');
await seedAll();
const { default: mongoose } = await import('mongoose');
const { User, Evidence, JobTarget, PracticePlan, Review, RoleGuide } = await import('../src/models/index.js');
const counts = {
  users: await User.countDocuments({}),
  evidence: await Evidence.countDocuments({}),
  targets: await JobTarget.countDocuments({}),
  plans: await PracticePlan.countDocuments({}),
  reviews: await Review.countDocuments({}),
  roleGuides: await RoleGuide.countDocuments({}),
};
console.log('[validate-seed]', JSON.stringify(counts));
await mongoose.disconnect();
await mem.stop();
