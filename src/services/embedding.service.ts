/**
 * Wraps the embedding provider. Stubbed: plug in your model/API of choice here.
 * To store vectors in Postgres, install the pgvector extension on your server.
 */
export async function embed(_text: string): Promise<number[]> {
  // TODO: call embedding provider
  return [];
}

export async function embedMany(texts: string[]): Promise<number[][]> {
  return Promise.all(texts.map(embed));
}
