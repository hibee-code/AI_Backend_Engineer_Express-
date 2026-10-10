import { prisma } from '../lib/prisma';
import { appEvents } from '../lib/events';
import { logger, serializeError } from '../lib/logger';
import { AI_EVENTS } from './ai.types';

// Record every embedding call in UsageLog. This table feeds the cost
// tracking dashboard.
appEvents.on(AI_EVENTS.EMBEDDING_GENERATED, async (data) => {
  try {
    await prisma.usageLog.create({
      data: {
        userId: data.userId,
        action: 'embedding',
        tokens: data.tokensUsed,
        costUsd: data.costUsd,
        metadata: {
          model: data.model,
          documentId: data.documentId,
          cached: data.cached,
        },
      },
    });
  } catch (error) {
    // Log but don't crash. Usage tracking is a side effect.
    logger.error('Failed to record embedding usage', {
      correlationId: data.correlationId,
      userId: data.userId,
      documentId: data.documentId,
      error: serializeError(error),
    });
  }
});
