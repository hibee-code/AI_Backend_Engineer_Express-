import { appEvents } from '../lib/events';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/error-handler';
import { queueDocumentForProcessing } from '../queues/document.queue';
import { documentRepository, type DocumentStatus } from '../repositories/document.repository';

export async function createDocument(data: { title: string; content: string; userId: string }) {
  // Create the document with pending status
  const doc = await prisma.document.create({
    data: {
      userId: data.userId,
      title: data.title,
      filename: data.title.toLowerCase().replace(/\s+/g, '-'),
      content: data.content,
      status: 'pending',
    },
  });

  // Queue for background processing
  const jobId = await queueDocumentForProcessing(doc.id, data.userId);

  appEvents.emit('doc:created', {
    userId: data.userId,
    documentId: doc.id,
    title: doc.title,
  });

  // Return 202 Accepted (not 201 Created)
  // The document exists but isn't ready yet
  return { document: doc, jobId };
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
