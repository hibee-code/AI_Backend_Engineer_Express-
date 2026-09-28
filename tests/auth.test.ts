import jwt from 'jsonwebtoken';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { app } from '../src/app';
import { config } from '../src/lib/config';
import { generateAccessToken, generateRefreshToken } from '../src/lib/token';

// These tests never reach the database: every request is rejected by middleware first.
const user = { id: 'user_123', role: 'user', tier: 'free' };

describe('authenticate middleware', () => {
  it('returns 401 without a token', async () => {
    const res = await request(app).get('/api/v1/documents');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('No token provided');
  });

  it('returns 401 "Token expired" for an expired access token', async () => {
    const expired = jwt.sign(
      { sub: user.id, role: 'user', type: 'access' },
      config.JWT_ACCESS_SECRET,
      {
        expiresIn: -10,
      },
    );
    const res = await request(app)
      .get('/api/v1/documents')
      .set('Authorization', `Bearer ${expired}`);
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Token expired');
  });

  it('rejects a refresh token used as an access token', async () => {
    const res = await request(app)
      .get('/api/v1/documents')
      .set('Authorization', `Bearer ${generateRefreshToken(user)}`);
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid token');
  });

  it('rejects a token with the wrong type claim', async () => {
    const wrongType = jwt.sign(
      { sub: user.id, role: 'user', type: 'refresh' },
      config.JWT_ACCESS_SECRET,
    );
    const res = await request(app)
      .get('/api/v1/documents')
      .set('Authorization', `Bearer ${wrongType}`);
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid token type');
  });
});

describe('authorize middleware', () => {
  it('returns 403 when a regular user hits an admin route', async () => {
    const res = await request(app)
      .get('/api/v1/admin/stats')
      .set('Authorization', `Bearer ${generateAccessToken(user)}`);
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Insufficient permissions');
  });
});

describe('auth routes validation', () => {
  it('rejects an invalid register body', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({ email: 'bad' });
    expect(res.status).toBe(400);
  });

  it('requires a refreshToken for /refresh', async () => {
    const res = await request(app).post('/api/v1/auth/refresh').send({});
    expect(res.status).toBe(400);
  });

  it('rejects a malformed refresh token', async () => {
    const res = await request(app).post('/api/v1/auth/refresh').send({ refreshToken: 'nope' });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid refresh token');
  });
});
