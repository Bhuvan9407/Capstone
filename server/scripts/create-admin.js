/**
 * Bootstrap the FIRST administrator through a controlled setup script.
 * No admin credentials are ever hardcoded. Credential must come from stdin.
 *
 * Usage:  npm run create-admin   (interactive prompts)
 * Env:    NONE — this script always prompts, so secrets never live in files.
 */
import readline from 'node:readline/promises';
import process from 'node:process';
import 'dotenv/config';
import argon2 from 'argon2';
import mongoose from 'mongoose';
import User from '../src/models/User.js';
import { connectMongo } from '../src/config/index.js';

const ask = async (question, { hidden = false } = {}) => {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  if (hidden) {
    process.stdout.write(question);
    const chars = [];
    process.stdin.setRawMode(true);
    for await (const chunk of process.stdin) {
      const s = chunk.toString();
      if (s === '\r' || s === '\n') break;
      if (s === '\u0003') process.exit(1);
      chars.push(s[0]);
    }
    process.stdin.setRawMode(false);
    rl.close();
    console.log('');
    return chars.join('');
  }
  const answer = await rl.question(question);
  rl.close();
  return answer;
};

const run = async () => {
  await connectMongo();
  const name = await ask('Admin name: ');
  const email = (await ask('Admin email: ')).toLowerCase().trim();
  const password = await ask('Admin password (min 8 chars, letters+numbers): ', { hidden: true });

  if (name.length < 2 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || password.length < 8) {
    console.error('Aborted: invalid inputs.');
    process.exit(1);
  }
  if (await User.exists({ email })) {
    console.error('Aborted: email already registered.');
    process.exit(1);
  }
  const user = await User.create({
    name,
    email,
    passwordHash: await argon2.hash(password),
    role: 'admin',
    emailVerified: true, // set up via controlled script, not email flow
  });
  console.log(`Administrator created: ${user.email} (role=admin). Store credentials safely.`);
  await mongoose.disconnect();
};

run().catch((err) => {
  console.error('Admin setup failed:', err.message);
  process.exit(1);
});
