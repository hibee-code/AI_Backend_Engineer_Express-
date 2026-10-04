/**
 * Split text into chunks of at most `maxChars` characters, breaking on whitespace
 * so words are never cut in half. A single word longer than `maxChars` becomes
 * its own chunk.
 */
export function splitIntoChunks(text: string, maxChars: number): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const chunks: string[] = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxChars) {
      current = candidate;
    } else {
      if (current) chunks.push(current);
      current = word;
    }
  }
  if (current) chunks.push(current);

  return chunks;
}

/**
 * Rough token estimate: ~4 characters per token for English text.
 * Good enough for budgeting; use a real tokenizer when exact counts matter.
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
