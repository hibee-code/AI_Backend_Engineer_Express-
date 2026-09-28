import type { RequestHandler } from 'express';
import { verifyToken, type AuthPayload } from '../services/auth.service';
import { AppError } from './error-handler';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

export const authenticate: RequestHandler = (req, _res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    throw new AppError(401, 'Missing or malformed Authorization header');
  }

  req.user = verifyToken(header.slice('Bearer '.length));
  next();
};
