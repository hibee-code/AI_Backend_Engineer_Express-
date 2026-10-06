import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { logger } from '../lib/logger';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      // Set by requestLogger, which runs before every route
      correlationId: string;
    }
  }
}

const CORRELATION_ID_PATTERN = /^[A-Za-z0-9._-]{1,128}$/;

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  // Reuse the caller's correlation ID only if it looks sane. It is untrusted
  // input that ends up in every log line and in the response header.
  const incomingId = req.headers['x-correlation-id'];
  const correlationId =
    typeof incomingId === 'string' && CORRELATION_ID_PATTERN.test(incomingId)
      ? incomingId
      : randomUUID();

  // Attach to the request so other code can use it
  req.correlationId = correlationId;

  // Add it to the response headers so the client can reference it
  res.setHeader('X-Correlation-Id', correlationId);

  const startTime = Date.now();

  // Log the incoming request
  logger.http('Request received', {
    correlationId,
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  });

  // Log the response when it finishes
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const logData = {
      correlationId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      durationMs: duration,
      userId: req.user?.id,
    };

    if (res.statusCode >= 500) {
      logger.error('Request failed', logData);
    } else if (res.statusCode >= 400) {
      logger.warn('Request client error', logData);
    } else {
      logger.info('Request completed', logData);
    }
  });

  next();
}
