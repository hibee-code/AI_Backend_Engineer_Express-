import crypto from 'crypto';
import { openaiBreaker } from '../lib/http/openai.breaker';
import { cacheGetMany, cacheSetMany, CACHE_TTL } from '../lib/cache';
import { appEvents } from '../lib/events';
import { AI_EVENTS } from '../events/ai.types';
import { logger } from '../lib/logger';
import { cacheOperations } from '../lib/metrics';
import { prisma } from '../lib/prisma';

/**
 * Embedding service: turns text into vectors (OpenAI) and stores them in
 * Chunk.embedding (pgvector).
 *
 * Every OpenAI call goes through requestEmbeddings(), and every cached lookup
 * through generateEmbeddingsBatchCached(). The single-text functions are thin
 * wrappers around the batch ones, so batching, logging, cost tracking and
 * caching each live in exactly one place.
 */

const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIMENSIONS = 1536; // Must match the vector(1536) column

// OpenAI supports up to 2048 inputs per request; 100 stays well under the limit
const EMBEDDING_BATCH_SIZE = 100;

// Rows updated per SQL statement when storing embeddings
const STORE_BATCH_SIZE = 500;

// Approximate cost of text-embedding-3-small: $0.02 per 1M tokens
const COST_PER_MILLION_TOKENS_USD = 0.02;

// Optional request context, carried into logs and the cost event
export interface EmbeddingContext {
  correlationId?: string;
  userId?: string;
  documentId?: string;
}

// ── Generate (no cache) ─────────────────────────────────────────

export async function generateEmbeddings(
  texts: string[],
  context: EmbeddingContext = {},
): Promise<number[][]> {
  if (texts.length === 0) return [];

  const embeddings: number[][] = [];
  let tokensUsed = 0;

  for (let i = 0; i < texts.length; i += EMBEDDING_BATCH_SIZE) {
    const batch = texts.slice(i, i + EMBEDDING_BATCH_SIZE);
    const result = await requestEmbeddings(batch);

    embeddings.push(...result.embeddings);
    tokensUsed += result.tokensUsed;

    logger.info('Embedding batch processed', {
      correlationId: context.correlationId,
      model: EMBEDDING_MODEL,
      batchIndex: Math.floor(i / EMBEDDING_BATCH_SIZE),
      batchSize: batch.length,
      totalTexts: texts.length,
      tokensUsed: result.tokensUsed,
      durationMs: result.durationMs,
    });
  }

  // Usage tracking: events/ai.events.ts records this in UsageLog
  appEvents.emit(AI_EVENTS.EMBEDDING_GENERATED, {
    ...context,
    model: EMBEDDING_MODEL,
    tokensUsed,
    costUsd: (tokensUsed / 1_000_000) * COST_PER_MILLION_TOKENS_USD,
    cached: false,
  });

  return embeddings;
}

export async function generateEmbedding(
  text: string,
  context: EmbeddingContext = {},
): Promise<number[]> {
  const [embedding] = await generateEmbeddings([text], context);
  return embedding!;
}

// ── Generate (cached) ───────────────────────────────────────────
// The same text always produces the same embedding, so cached vectors are
// reused across retries, re-uploads and duplicate chunks.

export async function generateEmbeddingsBatchCached(
  texts: string[],
  context: EmbeddingContext = {},
): Promise<number[][]> {
  if (texts.length === 0) return [];

  // 1. Check the cache for every text in one round trip
  const keys = texts.map(embeddingCacheKey);
  const results = await cacheGetMany<number[]>(keys);
  const missIndexes = results.flatMap((r, i) => (r ? [] : [i]));

  const cacheHits = texts.length - missIndexes.length;
  cacheOperations.inc({ operation: 'get', result: 'hit' }, cacheHits);
  cacheOperations.inc({ operation: 'get', result: 'miss' }, missIndexes.length);

  logger.info('Embedding batch cache check', {
    correlationId: context.correlationId,
    total: texts.length,
    cacheHits,
    cacheMisses: missIndexes.length,
  });

  // 2. Generate embeddings only for uncached texts
  if (missIndexes.length > 0) {
    const fresh = await generateEmbeddings(
      missIndexes.map((i) => texts[i]!),
      context,
    );

    // 3. Fill in the results and cache the new embeddings
    missIndexes.forEach((textIndex, j) => {
      results[textIndex] = fresh[j]!;
    });
    await cacheSetMany(
      missIndexes.map((textIndex, j) => ({ key: keys[textIndex]!, value: fresh[j] })),
      CACHE_TTL.EMBEDDING,
    );
    cacheOperations.inc({ operation: 'set', result: 'ok' }, missIndexes.length);
  }

  return results as number[][];
}

export async function generateEmbeddingCached(
  text: string,
  context: EmbeddingContext = {},
): Promise<number[]> {
  const [embedding] = await generateEmbeddingsBatchCached([text], context);
  return embedding!;
}

// ── Store ───────────────────────────────────────────────────────
// Prisma can't write the pgvector type, so these use raw SQL: one UPDATE per
// batch, joined against (id, vector) pairs passed in as two parallel arrays.

export async function storeChunkEmbeddingsBatch(
  chunks: { id: string; embedding: number[] }[],
): Promise<void> {
  for (let i = 0; i < chunks.length; i += STORE_BATCH_SIZE) {
    const batch = chunks.slice(i, i + STORE_BATCH_SIZE);
    const ids = batch.map((chunk) => chunk.id);
    const vectors = batch.map((chunk) => toVectorLiteral(chunk.embedding));

    await prisma.$executeRaw`
      UPDATE "Chunk" AS c
      SET "embedding" = v.embedding::vector
      FROM unnest(${ids}::text[], ${vectors}::text[]) AS v(id, embedding)
      WHERE c."id" = v.id
    `;
  }
}

export async function storeChunkEmbedding(chunkId: string, embedding: number[]): Promise<void> {
  await storeChunkEmbeddingsBatch([{ id: chunkId, embedding }]);
}

// ── Internals ───────────────────────────────────────────────────

// The only function that calls OpenAI. Sends one batch of at most
// EMBEDDING_BATCH_SIZE texts through the circuit breaker (which also retries).
async function requestEmbeddings(
  texts: string[],
): Promise<{ embeddings: number[][]; tokensUsed: number; durationMs: number }> {
  const startTime = Date.now();
  const response = await openaiBreaker.fire('/embeddings', {
    input: texts,
    model: EMBEDDING_MODEL,
  });

  // Each result carries the index of its input; sort rather than trust order
  const data: { index: number; embedding: number[] }[] = response.data.data;
  const embeddings = data.sort((a, b) => a.index - b.index).map((item) => item.embedding);

  // A wrong size would fail later inside Postgres with a vague error
  for (const embedding of embeddings) {
    if (embedding.length !== EMBEDDING_DIMENSIONS) {
      throw new Error(
        `Expected ${EMBEDDING_DIMENSIONS}-dimension embeddings, got ${embedding.length}`,
      );
    }
  }

  return {
    embeddings,
    tokensUsed: response.data.usage?.total_tokens ?? 0,
    durationMs: Date.now() - startTime,
  };
}

// Model is part of the key so switching models never returns stale vectors
function embeddingCacheKey(text: string): string {
  return `embed:${EMBEDDING_MODEL}:${contentHash(text)}`;
}

function contentHash(text: string): string {
  return crypto.createHash('sha256').update(text).digest('hex');
}

// pgvector's text format: "[0.1,0.2,...]"
function toVectorLiteral(embedding: number[]): string {
  return `[${embedding.join(',')}]`;
}
