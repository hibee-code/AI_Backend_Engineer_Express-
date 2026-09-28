import { prisma } from '../lib/prisma';

export type DocumentStatus = 'PENDING' | 'PROCESSING' | 'READY' | 'FAILED';

export const documentRepository = {
  create(data: { userId: string; title: string; content: string }) {
    return prisma.document.create({ data });
  },

  findById(id: string) {
    return prisma.document.findUnique({ where: { id } });
  },

  listByUser(userId: string, opts: { skip: number; take: number; status?: DocumentStatus }) {
    return prisma.document.findMany({
      where: { userId, status: opts.status },
      orderBy: { createdAt: 'desc' },
      skip: opts.skip,
      take: opts.take,
    });
  },

  countByUser(userId: string, status?: DocumentStatus) {
    return prisma.document.count({ where: { userId, status } });
  },

  updateStatus(id: string, status: DocumentStatus) {
    return prisma.document.update({ where: { id }, data: { status } });
  },

  delete(id: string) {
    return prisma.document.delete({ where: { id } });
  },

  count() {
    return prisma.document.count();
  },
};
