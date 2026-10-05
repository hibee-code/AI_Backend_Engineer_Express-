// Entry point for background job processing. Runs separately from the API server:
//   npm run worker        (development, reloads on change)
//   npm run worker:start  (production, after npm run build)
import { worker } from './queues/document.worker';
import { embeddingWorker } from './queues/embedding.worker';
import { redisConnection } from './queues/connection';
import { logger } from './lib/logger';
import { prisma } from './lib/prisma';

logger.info({ event: 'worker:started', queues: [worker.name, embeddingWorker.name] });

// Finish in-flight jobs before exiting so they aren't left half-processed
async function shutdown(signal: string) {
  logger.info({ event: 'worker:stopping', signal });
  await Promise.all([worker.close(), embeddingWorker.close()]);
  await redisConnection.quit();
  await prisma.$disconnect();
  process.exit(0);
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
