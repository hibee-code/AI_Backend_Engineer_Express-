import { AppError } from '../middleware/error-handler';
import { documentRepository, type DocumentStatus } from '../repositories/document.repository';

export async function createDocument(userId: string, title: string, content: string) {
  // TODO: enqueue a job in src/jobs/ to chunk + embed (see embedding.service) and mark READY
  return documentRepository.create({ userId, title, content });
}

export async function listDocuments(
  userId: string,
  { page, limit, status }: { page: number; limit: number; status?: DocumentStatus },
) {
  const [data, total] = await Promise.all([
    documentRepository.listByUser(userId, { skip: (page - 1) * limit, take: limit, status }),
    documentRepository.countByUser(userId, status),
  ]);

  return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

export async function getDocument(userId: string, id: string) {
  const doc = await documentRepository.findById(id);
  if (!doc || doc.userId !== userId) throw new AppError(404, 'Document not found');
  return doc;
}

export async function deleteDocument(userId: string, id: string) {
  await getDocument(userId, id);
  await documentRepository.delete(id);
}

export function countDocuments() {
  return documentRepository.count();
}
