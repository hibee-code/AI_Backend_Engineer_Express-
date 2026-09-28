import type { Request, Response } from 'express';
import { z } from 'zod';
import * as chatService from '../services/chat.service';

export const sendMessageSchema = z.object({
  content: z.string().min(1).max(4000),
});

type SendMessage = z.infer<typeof sendMessageSchema>;

export async function send(req: Request<unknown, unknown, SendMessage>, res: Response) {
  res.status(201).json(await chatService.sendMessage(req.user!.sub, req.body.content));
}

export async function history(req: Request, res: Response) {
  res.json(await chatService.getHistory(req.user!.sub));
}
