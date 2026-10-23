import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import morgan from 'morgan';
import { config } from './config/index.js';
import apiRoutes from './routes/index.js';
import { errorMiddleware, notFound } from './middleware/error.js';
import { csrfMiddleware, ensureCsrfCookie } from './middleware/csrf.js';
import { authLimiter, passwordResetLimiter, apiLimiter } from './middleware/rateLimit.js';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'same-origin');
    next();
  });
  if (!config.isTest) app.use(morgan('dev'));

  app.use(
    cors({
      origin(origin, cb) {
        if (!origin) return cb(null, true); // curl / same-origin
        if (config.frontends.includes(origin)) return cb(null, true);
        return cb(null, false); // silently deny other origins
      },
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'X-CSRF-Token'],
      maxAge: 600,
    })
  );

  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: false, limit: '2mb' }));
  app.use(cookieParser());

  app.use('/api', apiLimiter);
  app.use('/api/auth/login', authLimiter);
  app.use('/api/auth/register', authLimiter);
  app.use('/api/auth/forgot-password', passwordResetLimiter);
  app.use('/api/auth/reset-password', passwordResetLimiter);

  // Issuing a readable CSRF token cookie on every safe request keeps the
  // double-submit pairing available for the SPA before login flows.
  app.use('/api', ensureCsrfCookie);

  // CSRF enforced on all cookie-authenticated mutating requests. Unauthenticated
  // auth flows are SameSite-protected and pre-login, so they are exempt.
  app.use('/api', (req, res, next) => {
    if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') return next();
    if (req.path.startsWith('/auth/') && req.path !== '/auth/change-password') return next();
    return csrfMiddleware(req, res, next);
  });

  app.use('/api', apiRoutes);

  app.use(notFound);
  app.use(errorMiddleware);
  return app;
}
