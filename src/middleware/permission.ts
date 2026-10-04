import { Request, Response, NextFunction } from 'express';
import { getUserPermissions } from '../services/rbac.service';

// Must run after `authenticate`.
// Checks the RBAC tables: does any of the user's roles grant this permission?
export function requirePermission(permission: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const permissions = await getUserPermissions(req.user.id);
    if (!permissions.has(permission)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
}
