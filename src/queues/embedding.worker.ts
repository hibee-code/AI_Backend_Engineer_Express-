import { Worker } from 'bullmq';
import { redisConnection } from './connection';
import { openaiBreaker } from '../lib/http/openai.breaker';

// In the worker, configure rate limiting:
const worker = new Worker(
  'embedding-generation',
  async (job) => {
    // Call OpenAI through the breaker
    const response = await openaiBreaker.fire('/embeddings', {
      input: job.data.text,
      model: 'text-embedding-3-small',
    });

    // Return only the vector. BullMQ stores return values in Redis as JSON, and
    // the full axios response has circular references, so returning it fails the job.
    return response.data.data[0].embedding as number[];
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
