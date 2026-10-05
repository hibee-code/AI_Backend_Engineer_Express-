import CircuitBreaker from 'opossum';
import { openaiClient } from './openai.client';
import { withRetry } from './retry';

// The function we're protecting
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function callOpenAI(path: string, body: any) {
  return withRetry(() => openaiClient.post(path, body));
}

// Wrap it in a circuit breaker
export const openaiBreaker = new CircuitBreaker(callOpenAI, {
  // Must cover ALL retry attempts, since withRetry runs inside the breaker:
  // up to 3 × 30s client timeouts plus backoff. (The lesson's 35s would cut
  // retries off mid-way and count them as failures.)
  timeout: 100000,
  errorThresholdPercentage: 50, // Open if 50% of recent requests fail
  resetTimeout: 30000, // Try again after 30 seconds
  rollingCountTimeout: 60000, // Track failures over a 60-second window
  rollingCountBuckets: 10,
});

// Optional: fallback when the breaker is open
openaiBreaker.fallback(() => {
  throw new Error('OpenAI is temporarily unavailable. Please try again shortly.');
});

// Visibility into state changes
openaiBreaker.on('open', () =>
  console.warn('OpenAI circuit breaker OPENED — requests will fail fast'),
);
openaiBreaker.on('halfOpen', () =>
  console.warn('OpenAI circuit breaker HALF-OPEN — testing recovery'),
);
openaiBreaker.on('close', () => console.log('OpenAI circuit breaker CLOSED — normal operation'));
