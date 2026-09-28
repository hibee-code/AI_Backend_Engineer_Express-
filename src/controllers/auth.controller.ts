import type { Request, Response } from 'express';
import { z } from 'zod';
import * as authService from '../services/auth.service';

export const loginSchema = z.object({
  email: z.email().toLowerCase(),
  password: z.string().min(8).max(72), // bcrypt ignores bytes past 72
});

export const registerSchema = loginSchema.extend({
  name: z.string().trim().min(1).max(100),
});

type RegisterBody = z.infer<typeof registerSchema>;
type LoginBody = z.infer<typeof loginSchema>;

export async function register(req: Request<unknown, unknown, RegisterBody>, res: Response) {
  const { name, email, password } = req.body;
  res.status(201).json(await authService.register(name, email, password));
}

export async function login(req: Request<unknown, unknown, LoginBody>, res: Response) {
  res.json(await authService.login(req.body.email, req.body.password, req.get('user-agent')));
}

export async function me(req: Request, res: Response) {
  res.json(await authService.getCurrentUser(req.user!.sub));
}
