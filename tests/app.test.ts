import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { app } from '../src/app';

describe('app', () => {
  it('GET /health returns ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok', environment: 'test' });
  });

  it('returns 404 for unknown routes', async () => {
    const res = await request(app).get('/nope');
    expect(res.status).toBe(404);
  });

  // Add route tests (auth, documents, chat) as you mount them in app.ts
});
