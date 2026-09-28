import type { Request, Response } from 'express';
import { z } from 'zod';
import * as authService from '../services/auth.service';

// Request body schemas, used by validate() in routes/auth.ts
export const loginSchema = z.object({
  email: z.email().toLowerCase(),
  password: z.string().min(8).max(72), // bcrypt ignores bytes past 72
});

export const registerSchema = loginSchema.extend({
  name: z.string().trim().min(1).max(100),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});

export async function me(req: Request, res: Response) {
  res.json(await authService.getCurrentUser(req.user!.id));
}
