import { Router } from 'express';
import * as documentController from '../controllers/document.controller';
import { authenticate } from '../middleware/authenticate';
import { validate } from '../middleware/validate';

export const documentRouter = Router();

documentRouter.use(authenticate);

documentRouter.get('/', documentController.list);
documentRouter.post(
  '/',
  validate({ body: documentController.createDocumentSchema }),
  documentController.create,
);
documentRouter.get(
  '/:id',
  validate({ params: documentController.documentIdSchema }),
  documentController.getById,
);
documentRouter.delete(
  '/:id',
  validate({ params: documentController.documentIdSchema }),
  documentController.remove,
);
