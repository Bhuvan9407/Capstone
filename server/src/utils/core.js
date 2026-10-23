import crypto from 'node:crypto';
import mongoose from 'mongoose';

export class AppError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
    this.expose = true;
  }
}

export const fail = (status, message, details) => {
  throw new AppError(status, message, details);
};

/** Wrap async route handlers so rejected promises hit the error middleware. */
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

/** Validate a Mongoose ObjectId or fail with 400. */
export const objectId = (value, name = 'id') => {
  if (typeof value !== 'string' || !/^[a-f\d]{24}$/i.test(value)) {
    fail(400, `Invalid ${name}`);
  }
  return value;
};

export const newToken = (bytes = 32) => crypto.randomBytes(bytes).toString('base64url');

export const sha256 = (value) =>
  crypto.createHash('sha256').update(value).digest('hex');

export const slugify = (value) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 48) || 'user';

export const clamp = (value, min, max) =>
  Math.min(max, Math.max(min, value));

/** Consistent pagination query parsing */
export const pagination = (query) => {
  const page = clamp(parseInt(query.page, 10) || 1, 1, 10000);
  const limit = clamp(parseInt(query.limit, 10) || 20, 1, 100);
  return { page, limit, skip: (page - 1) * limit };
};

/** Cast a value to a Mongoose ObjectId or fail validation. */
export const toOid = (value) => {
  if (value instanceof mongoose.Types.ObjectId) return value;
  if (typeof value === 'string' && mongoose.isObjectIdOrHexString(value)) {
    return new mongoose.Types.ObjectId(value);
  }
  return fail(400, 'Invalid identifier');
};
