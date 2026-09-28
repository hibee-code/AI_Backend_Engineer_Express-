import crypto from 'node:crypto';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { config } from './config';

// Read from the validated config (not process.env directly) so a missing or
// short secret fails at startup instead of on the first login.
// These should never be the same value.
// If they were, a refresh token could be used as an access token.
const ACCESS_SECRET = config.JWT_ACCESS_SECRET;
const REFRESH_SECRET = config.JWT_REFRESH_SECRET;

export interface TokenPayload {
  sub: string; // User ID
  role: string; // User role ("user" | "admin"), checked by authorize()
  tier: string; // Plan tier ("free" | ...), for plan limits
  type: 'access' | 'refresh';
}

type TokenUser = { id: string; role: string; tier: string };

export function generateAccessToken(user: TokenUser) {
  return jwt.sign(
    { sub: user.id, role: user.role, tier: user.tier, type: 'access' },
    ACCESS_SECRET,
    { expiresIn: config.JWT_EXPIRES_IN as SignOptions['expiresIn'] }, // 15m
  );
}

export function generateRefreshToken(user: TokenUser) {
  return jwt.sign(
    { sub: user.id, role: user.role, tier: user.tier, type: 'refresh' },
    REFRESH_SECRET,
    {
      expiresIn: config.REFRESH_TOKEN_EXPIRES_IN as SignOptions['expiresIn'], // 7d
      // Unique ID per token. Without it, two logins in the same second produce
      // identical tokens, which would collide on RefreshToken.token @unique.
      jwtid: crypto.randomUUID(),
    },
  );
}

export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, ACCESS_SECRET) as TokenPayload;
}

export function verifyRefreshToken(token: string): TokenPayload {
  return jwt.verify(token, REFRESH_SECRET) as TokenPayload;
}
