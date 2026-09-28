import { prisma } from '../lib/prisma';

export type MessageRole = 'user' | 'assistant';

export const messageRepository = {
  create(data: { userId: string; role: MessageRole; content: string }) {
    return prisma.message.create({ data });
  },

  listByUser(userId: string, take = 50) {
    return prisma.message.findMany({ where: { userId }, orderBy: { createdAt: 'asc' }, take });
  },
};
