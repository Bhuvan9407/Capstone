import rateLimit from 'express-rate-limit';
import { config } from '../config/index.js';

// Tests create many accounts from one IP, so limiter windows are widened there.
const T = config.isTest;

const standard = (windowMs, max, message) =>
  rateLimit({
    windowMs,
    max: T ? 100000 : max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: { code: 'RATE_LIMITED', message } },
  });

export const authLimiter = standard(15 * 60 * 1000, 20, 'Too many attempts — try again in 15 minutes.');
export const passwordResetLimiter = standard(60 * 60 * 1000, 5, 'Too many reset attempts — try again in an hour.');
export const apiLimiter = standard(60 * 1000, T ? 100000 : 300, 'Too many requests.');
