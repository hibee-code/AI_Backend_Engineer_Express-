import type { RequestHandler } from 'express';
import type { Role } from '../services/auth.service';
import { AppError } from './error-handler';

/** Must run after `authenticate`. */
export const authorize =
  (...roles: Role[]): RequestHandler =>
  (req, _res, next) => {
    if (!req.user) throw new AppError(401, 'Not authenticated');
    if (!roles.includes(req.user.role)) throw new AppError(403, 'Forbidden');
    next();
  };
