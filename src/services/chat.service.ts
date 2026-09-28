import { messageRepository } from '../repositories/message.repository';

export async function sendMessage(userId: string, content: string) {
  await messageRepository.create({ userId, role: 'user', content });

  // TODO: retrieve relevant document chunks (embedding.service) and call an LLM
  const reply = 'Chat is not implemented yet.';

  return messageRepository.create({ userId, role: 'assistant', content: reply });
}

export function getHistory(userId: string) {
  return messageRepository.listByUser(userId);
}
