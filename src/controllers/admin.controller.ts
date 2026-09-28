import type { Request, Response } from 'express';
import * as authService from '../services/auth.service';
import * as documentService from '../services/document.service';

export async function listUsers(_req: Request, res: Response) {
  res.json(await authService.listUsers());
}

export async function stats(_req: Request, res: Response) {
  const [users, documents] = await Promise.all([
    authService.countUsers(),
    documentService.countDocuments(),
  ]);
  res.json({ users, documents });
}
