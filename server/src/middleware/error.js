import mongoose from 'mongoose';
import { ZodError } from 'zod';
import { MongoServerError } from 'mongodb';
import { AppError } from '../utils/core.js';
import { config } from '../config/index.js';

export const notFound = (req, res) => {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: `Route ${req.method} ${req.path} not found` } });
};

// eslint-disable-next-line no-unused-vars
export const errorMiddleware = (err, req, res, next) => {
  let status = err.status || 500;
  let code = err.code || 'INTERNAL_ERROR';
  let message = err.expose || err instanceof AppError ? err.message : 'Internal server error';
  let details = err.details;

  if (err instanceof AppError) {
    ({ status, message, details } = err);
    code = err.code || 'APP_ERROR';
  } else if (err instanceof ZodError) {
    status = 422;
    code = 'VALIDATION_ERROR';
    message = 'Validation failed';
    details = err.issues.map((i) => ({ field: i.path.join('.') || '_', message: i.message }));
  } else if (err instanceof mongoose.Error.ValidationError) {
    status = 422;
    code = 'VALIDATION_ERROR';
    message = 'Validation failed';
    details = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
  } else if (err instanceof MongoServerError && err.code === 11000) {
    status = 409;
    code = 'DUPLICATE_KEY';
    message = 'Resource already exists';
    details = Object.keys(err.keyValue || {}).map((k) => ({ field: k, message: 'already in use' }));
  } else if (err instanceof mongoose.Error.CastError) {
    status = 400;
    code = 'INVALID_ID';
    message = `Invalid identifier for ${err.path}`;
  } else if (err.type === 'entity.parse.failed' || err.type === 'entity.too.large') {
    status = err.type === 'entity.too.large' ? 413 : 400;
    code = err.type === 'entity.too.large' ? 'PAYLOAD_TOO_LARGE' : 'INVALID_JSON';
    message = err.type === 'entity.too.large' ? 'Request body too large' : 'Malformed JSON body';
  }

  if (status >= 500 && !config.isTest) {
    console.error('[error]', err);
  }

  if (res.headersSent) {
    return next(err);
  }

  res.status(status).json({ error: { code, message, details } });
};
