import crypto from 'node:crypto';
import { AppError } from '../utils/core.js';
import { config } from '../config/index.js';

export const CSRF_COOKIE = 'coach_csrf';
export const CSRF_HEADER = 'x-csrf-token';

/**
 * Double-submit cookie CSRF protection.
 * A random non-HttpOnly cookie is paired with the X-CSRF-Token header that the
 * frontend client echoes back on every mutating request. SameSite=Lax plus an
 * Origin allowlist check provide defense in depth.
 */
export const csrfMiddleware = (req, res, next) => {
  const cookieToken = req.cookies?.[CSRF_COOKIE];

  if (!cookieToken) {
    const token = crypto.randomBytes(24).toString('base64url');
    setCsrfCookie(res, token);
    return next(Object.assign(new AppError(403, 'Missing CSRF token — refresh and retry'), { code: 'CSRF' }));
  }

  const headerToken = req.get(CSRF_HEADER);
  if (!headerToken || headerToken !== cookieToken) {
    return next(Object.assign(new AppError(403, 'Invalid CSRF token'), { code: 'CSRF' }));
  }

  const origin = req.get('origin');
  if (!config.isTest && origin && !config.frontends.includes(origin) && origin !== `http://localhost:${config.port}`) {
    return next(Object.assign(new AppError(403, 'Cross-origin request rejected'), { code: 'CSRF_ORIGIN' }));
  }

  return next();
};

/** Ensure a CSRF cookie exists on safe(GET) responses so the SPA can pair the header later. */
export const ensureCsrfCookie = (req, res, next) => {
  if ((req.method === 'GET' || req.method === 'HEAD') && !req.cookies?.[CSRF_COOKIE]) {
    setCsrfCookie(res, crypto.randomBytes(24).toString('base64url'));
  }
  next();
};

export const setCsrfCookie = (res, token) => {
  res.cookie(CSRF_COOKIE, token, {
    httpOnly: false, // must be readable by the SPA to be echoed back
    sameSite: config.session.cookieSameSite,
    secure: config.session.cookieSecure,
    path: '/',
    maxAge: 7 * 24 * 3600 * 1000,
  });
};
