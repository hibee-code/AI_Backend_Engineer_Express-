// AI event names and payload types. No imports, so lib/events.ts can depend on
// this file without a circular import (same pattern as auth.types.ts).

export const AI_EVENTS = {
  EMBEDDING_GENERATED: 'ai:embedding-generated',
} as const;

export interface EmbeddingGeneratedEvent {
  correlationId?: string;
  userId?: string;
  documentId?: string;
  model: string;
  tokensUsed: number;
  costUsd: number;
  cached: boolean;
}

// Event name -> listener arguments. Used to type `appEvents`.
export type AiEventMap = {
  [AI_EVENTS.EMBEDDING_GENERATED]: [EmbeddingGeneratedEvent];
};
