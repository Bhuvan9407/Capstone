import AuthToken from '../models/AuthToken.js';
import { newToken, sha256, fail } from '../utils/core.js';

const TTL_MINUTES = { verify_email: 24 * 60, reset_password: 60 };

/** Issue a single-use expiring token for `kind`. Returns the raw (emailed) token. */
export const issueToken = async (kind, { userId, email, payload = {} }) => {
  if (!TTL_MINUTES[kind]) fail(500, `Unknown token kind ${kind}`);
  const raw = newToken(32);
  await AuthToken.create({
    kind,
    userId,
    email: email?.toLowerCase(),
    tokenHash: sha256(raw),
    expiresAt: new Date(Date.now() + TTL_MINUTES[kind] * 60 * 1000),
    payload,
  });
  return raw;
};

/** Atomically consume a single-use token; returns {userId, email, payload}. */
export const consumeToken = async (kind, raw, { markUsed = true } = {}) => {
  if (typeof raw !== 'string' || raw.length < 10) fail(400, 'Invalid or expired token');
  const doc = await AuthToken.findOne({ kind, tokenHash: sha256(raw) });
  if (!doc || doc.usedAt) fail(400, 'Invalid or expired token');
  if (doc.expiresAt < new Date()) {
    await doc.deleteOne().catch(() => {});
    fail(400, 'Invalid or expired token');
  }
  if (markUsed) doc.usedAt = new Date();
  if (markUsed) await doc.save();
  return { userId: doc.userId, email: doc.email, payload: doc.payload || {} };
};

export const dropTokensForUser = (kind, userId) =>
  AuthToken.deleteMany({ kind, userId }).catch(() => {});
