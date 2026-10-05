import { openaiBreaker } from '../lib/http/openai.breaker';

/**
 * Wraps the embedding provider (OpenAI). Calls go through a circuit breaker
 * (lib/http/openai.breaker.ts), which also retries transient failures.
 * To store vectors in Postgres, install the pgvector extension on your server.
 */
export async function embed(text: string): Promise<number[]> {
  const response = await openaiBreaker.fire('/embeddings', {
    input: text,
    model: 'text-embedding-3-small',
  });

  // OpenAI returns { data: [{ embedding: number[] }] }; axios wraps it in its own .data
  return response.data.data[0].embedding;
}

export async function embedMany(texts: string[]): Promise<number[][]> {
  return Promise.all(texts.map(embed));
}
