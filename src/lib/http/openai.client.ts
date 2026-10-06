import axios, { AxiosInstance } from 'axios';
import { logger } from '../logger';

export const openaiClient: AxiosInstance = axios.create({
  baseURL: 'https://api.openai.com/v1',
  timeout: 30000, // 30 seconds for AI responses
  headers: {
    Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    'Content-Type': 'application/json',
    'User-Agent': 'DocuChat/1.0',
  },
});

// Request interceptor: log every outgoing call
openaiClient.interceptors.request.use((config) => {
  const startTime = Date.now();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (config as any).metadata = { startTime };
  logger.debug('OpenAI request started', { method: config.method?.toUpperCase(), url: config.url });
  return config;
});

// Response interceptor: log timing and normalize errors
openaiClient.interceptors.response.use(
  (response) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const startTime = (response.config as any).metadata?.startTime;
    const duration = startTime ? Date.now() - startTime : 0;
    logger.info('OpenAI request completed', {
      method: response.config.method?.toUpperCase(),
      url: response.config.url,
      statusCode: response.status,
      durationMs: duration,
    });
    return response;
  },
  (error) => {
    const startTime = error.config?.metadata?.startTime;
    const duration = startTime ? Date.now() - startTime : 0;

    const logData = {
      method: error.config?.method?.toUpperCase(),
      url: error.config?.url,
      durationMs: duration,
    };

    if (error.response) {
      // Server responded with error status. Log OpenAI's error object only,
      // never the full body, which can echo back prompt content.
      logger.error('OpenAI request failed', {
        ...logData,
        statusCode: error.response.status,
        apiError: error.response.data?.error,
      });
    } else if (error.request) {
      // No response received (timeout, network error)
      logger.error('OpenAI request got no response', { ...logData, error: error.message });
    } else {
      logger.error('OpenAI request setup failed', { ...logData, error: error.message });
    }

    return Promise.reject(error);
  },
);

// Response interceptor: warn when the rate limit is running low
openaiClient.interceptors.response.use((response) => {
  const remaining = parseInt(response.headers['x-ratelimit-remaining-requests'] || '999');

  if (remaining < 50) {
    logger.warn('OpenAI rate limit running low', { remainingRequests: remaining });
  }

  return response;
});
