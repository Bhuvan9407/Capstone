import { z } from 'zod';
import { AppError, asyncHandler } from '../utils/core.js';

/** Express middleware: validate req.body against a Zod schema, or 422. */
export const validate = (schema) => asyncHandler(async (req, _res, next) => {
  const result = schema.safeParse(req.body ?? {});
  if (!result.success) {
    const details = result.error.issues.map((i) => ({
      field: i.path.join('.') || '_',
      message: i.message,
    }));
    throw new AppError(422, 'Validation failed', details);
  }
  req.body = result.data;
  return next();
});
