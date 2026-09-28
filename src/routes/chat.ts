import { Router } from 'express';
import { z } from 'zod';
import * as chatController from '../controllers/chat.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

router.use(authenticate);

router.get('/history', chatController.history);
router.post(
  '/',
  validate(z.object({ body: chatController.sendMessageSchema })),
  chatController.send,
);

export default router;
