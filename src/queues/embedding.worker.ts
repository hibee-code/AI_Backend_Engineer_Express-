import { Worker } from 'bullmq';
import { redisConnection } from './connection';
import { generateEmbeddingCached } from '../services/embedding.service';

// In the worker, configure rate limiting:
const worker = new Worker(
  'embedding-generation',
  async (job) => {
    // Goes through the embedding service: cache, circuit breaker, logging, cost event.
    // Returns only the vector, which BullMQ stores in Redis as JSON.
    return generateEmbeddingCached(job.data.text, { correlationId: job.data.correlationId });
  },
  {
    connection: redisConnection,
    concurrency: 5,
    limiter: {
      max: 100, // Max 100 jobs
      duration: 60000, // Per 60 seconds
    },
  },
);

export { worker as embeddingWorker };
