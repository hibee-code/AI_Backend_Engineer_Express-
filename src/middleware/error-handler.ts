import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError, z } from 'zod';
import { config } from '../lib/config';
import { logger } from '../lib/logger';

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const notFound: RequestHandler = (req, _res, next) => {
  next(new AppError(404, `Route not found: ${req.method} ${req.originalUrl}`));
};

// Express 5 forwards rejected promises from async handlers here automatically
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message, details: err.details });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({ error: 'Validation failed', details: z.flattenError(err) });
    return;
  }

  logger.error({ err }, 'Unhandled error');
  res.status(500).json({
    error: 'Internal server error',
    ...(config.NODE_ENV !== 'production' && { message: (err as Error).message }),
  });
};
