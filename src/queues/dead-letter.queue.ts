// src/queues/dead-letter.queue.ts
import { Queue } from 'bullmq';
import { redisConnection } from './connection';

// Jobs that failed every retry end up here for inspection or manual replay.
// No worker consumes this queue, and jobs are kept (not auto-removed).
export const deadLetterQueue = new Queue('dead-letter', {
  connection: redisConnection,
});
