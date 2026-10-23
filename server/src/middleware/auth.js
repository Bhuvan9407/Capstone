import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { config } from '../config/index.js';
import Session from '../models/Session.js';
import User from '../models/User.js';
import { newToken, sha256, fail, asyncHandler } from '../utils/core.js';

const SessionModel = Session;

const sessionExpiry = () =>
  new Date(Date.now() + config.session.ttlHours * 3600 * 1000);

export const SESSION_COOKIE = 'coach_sid';

export const setSessionCookie = (res, rawToken) => {
  res.cookie(SESSION_COOKIE, rawToken, {
    httpOnly: true,
    secure: config.session.cookieSecure,
    sameSite: config.session.cookieSameSite,
    path: '/',
    maxAge: config.session.ttlHours * 3600 * 1000,
  });
};

export const clearSessionCookie = (res) => {
  res.cookie(SESSION_COOKIE, '', {
    httpOnly: true,
    secure: config.session.cookieSecure,
    sameSite: config.session.cookieSameSite,
    path: '/',
    maxAge: 0,
  });
};

/** Create a fresh session for a user (used on register/login/password reset). */
export const issueSession = async (user, meta = {}) => {
  const rawToken = newToken(32);
  await SessionModel.create({
    tokenHash: sha256(rawToken),
    userId: user._id,
    userAgent: String(meta.userAgent || '').slice(0, 200),
    ip: String(meta.ip || '').slice(0, 60),
    expiresAt: sessionExpiry(),
  });
  return rawToken;
};

/** Revoke a single session (logout). */
export const revokeSession = async (rawToken) => {
  if (!rawToken) return;
  await SessionModel.deleteOne({ tokenHash: sha256(rawToken) }).catch(() => {});
};

export const revokeAllUserSessions = (userId) =>
  SessionModel.deleteMany({ userId }).catch(() => {});

export const requireAuth = asyncHandler(async (req, _res, next) => {
  const rawToken = req.cookies?.[SESSION_COOKIE];
  if (!rawToken) return fail(401, 'Authentication required');
  const session = await SessionModel.findOne({ tokenHash: sha256(rawToken) });
  if (!session || session.expiresAt < new Date()) {
    if (session) await session.deleteOne();
    return fail(401, 'Session expired or invalid');
  }
  const user = await User.findById(session.userId);
  if (!user) return fail(401, 'Session user missing');
  if (user.status !== 'active') return fail(403, 'Account is disabled');
  if (!user.emailVerified && !req.path.startsWith('/auth')) {
    return fail(403, 'Verify your email to continue', 'EMAIL_UNVERIFIED');
  }
  req.user = user;
  req.authSession = session;
  next();
});

/** Guard used on student-only routes to block unverified accounts. */
export const requireVerifiedEmail = (req, res, next) => {
  if (!req.user) return fail(401, 'Authentication required');
  if (!req.user.emailVerified) {
    return fail(403, 'Verify your email address to access this feature', { code: 'EMAIL_UNVERIFIED' });
  }
  next();
};

/** Role gate: allow only listed roles. */
export const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) return fail(401, 'Authentication required');
  if (!roles.includes(req.user.role)) return fail(403, 'Not allowed for your role');
  next();
};

export const getPlayer = (req) => {
  if (!req.user) fail(401, 'Authentication required');
  return {
    id: String(req.user._id),
    role: req.user.role,
    email: req.user.email,
    name: req.user.name,
    emailVerified: req.user.emailVerified,
    slug: req.user.portfolioSlug,
  };
};

export const objectiveId = (value, label = 'id') => {
  if (typeof value === 'string' && mongoose.isObjectIdOrHexString(value) && /^[a-f\d]{24}$/i.test(value)) return value;
  return fail(400, `Invalid ${label}`);
};

export const toId = (value) => (value ? new mongoose.Types.ObjectId(String(value)) : null);

export const ensureUser = (req) => {
  if (!req.user) fail(401, 'Authentication required');
  return req.user;
};
