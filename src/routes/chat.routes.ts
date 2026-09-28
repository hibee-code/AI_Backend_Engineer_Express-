import { Router } from 'express';
import * as chatController from '../controllers/chat.controller';
import { authenticate } from '../middleware/authenticate';
import { validate } from '../middleware/validate';

export const chatRouter = Router();

chatRouter.use(authenticate);

chatRouter.get('/history', chatController.history);
chatRouter.post('/', validate({ body: chatController.sendMessageSchema }), chatController.send);
