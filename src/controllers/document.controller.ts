import type { Request, Response } from 'express';
import type { z } from 'zod';
import * as documentService from '../services/document.service';
import type {
  createDocumentSchema,
  documentParamsSchema,
  listDocumentsSchema,
} from '../validators/document.validator';

// Request shapes after validate() has run (see validators/document.validator.ts)
type ListQuery = z.infer<typeof listDocumentsSchema>['query'];
type CreateBody = z.infer<typeof createDocumentSchema>['body'];
type DocumentParams = z.infer<typeof documentParamsSchema>['params'];

// Express 5 forwards rejected promises to the error handler, so no try/catch needed.

export async function listDocuments(req: Request, res: Response) {
  const { page, limit, status } = req.query as unknown as ListQuery;
  const result = await documentService.listDocuments(req.user!.id, {
    page,
    limit,
    status,
  });
  res.json(result);
}

export async function createDocument(req: Request<unknown, unknown, CreateBody>, res: Response) {
  const result = await documentService.createDocument({
    userId: req.user!.id,
    title: req.body.title,
    content: req.body.content,
  });
  // 202 Accepted: the document is saved but still being processed in the background
  res.status(202).json(result);
}

export async function getDocument(req: Request<DocumentParams>, res: Response) {
  res.json(await documentService.getDocument(req.user!.id, req.params.id));
}

export async function deleteDocument(req: Request<DocumentParams>, res: Response) {
  await documentService.deleteDocument(req.user!.id, req.params.id);
  res.status(204).end();
}
