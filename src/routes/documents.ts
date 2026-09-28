import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  createDocument,
  deleteDocument,
  getDocument,
  listDocuments,
} from '../controllers/document.controller';

import {
  createDocumentSchema,
  listDocumentsSchema,
  documentParamsSchema,
} from '../validators/document.validator';

const router = Router();
router.use(authenticate); // All document routes require auth

/**
 * @swagger
 * /documents:
 *   get:
 *     summary: List user's documents
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, processing, ready, failed]
 *     responses:
 *       200:
 *         description: List of documents
 *       401:
 *         description: Not authenticated
 */
router.get('/', validate(listDocumentsSchema), listDocuments);

router.post('/', validate(createDocumentSchema), createDocument);

router.get('/:id', validate(documentParamsSchema), getDocument);

router.delete('/:id', validate(documentParamsSchema), deleteDocument);

export default router;
