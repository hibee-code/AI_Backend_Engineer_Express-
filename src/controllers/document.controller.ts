import type { Request, Response } from 'express';
import { z } from 'zod';
import * as documentService from '../services/document.service';

export const createDocumentSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1),
});

export const documentIdSchema = z.object({ id: z.cuid() });

type CreateDocument = z.infer<typeof createDocumentSchema>;
type DocumentParams = z.infer<typeof documentIdSchema>;

export async function create(req: Request<unknown, unknown, CreateDocument>, res: Response) {
  const doc = await documentService.createDocument(req.user!.sub, req.body.title, req.body.content);
  res.status(201).json(doc);
}

export async function list(req: Request, res: Response) {
  res.json(await documentService.listDocuments(req.user!.sub));
}

export async function getById(req: Request<DocumentParams>, res: Response) {
  res.json(await documentService.getDocument(req.user!.sub, req.params.id));
}

export async function remove(req: Request<DocumentParams>, res: Response) {
  await documentService.deleteDocument(req.user!.sub, req.params.id);
  res.status(204).end();
}
