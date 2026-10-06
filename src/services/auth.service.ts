import { prisma } from '../lib/prisma';
import { hashPassword, verifyPassword } from '../lib/password';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../lib/token';
import crypto from 'crypto';
import type { User } from '../generated/prisma/client';
import { AUTH_EVENTS } from '../events/auth.events';
import { appEvents } from '../lib/events';
import { AppError } from '../middleware/error-handler';
import { logger } from '../lib/logger';
import { userRepository } from '../repositories/user.repository';

// ── Register ────────────────────────────────────────────────
export async function register(data: {
  name: string;
  email: string;
  password: string;
  correlationId: string;
}) {
  // Check if user already exists
  const existing = await prisma.user.findUnique({
    where: { email: data.email.toLowerCase().trim() },
  });
  if (existing) {
    throw new AppError(409, 'Email already registered');
  }

  const passwordHash = await hashPassword(data.password);
  const user = await prisma.user.create({
    data: {
      name: data.name, // required by our schema
      email: data.email.toLowerCase().trim(),
      passwordHash,
    },
  });

  // Find the default role
  const defaultRole = await prisma.role.findFirst({
    where: { isDefault: true },
  });

  if (defaultRole) {
    await prisma.userRole.create({
      data: {
        userId: user.id,
        roleId: defaultRole.id,
      },
    });
  }

  logger.info('User registered', { correlationId: data.correlationId, userId: user.id });

  // Emit and move on. Don't wait for listeners.
  appEvents.emit(AUTH_EVENTS.USER_REGISTERED, {
    correlationId: data.correlationId,
    id: user.id,
    email: user.email,
    tier: user.tier,
  });

  // Don't return the hash
  return { id: user.id, email: user.email, tier: user.tier };
}

// ── Login ─────────────────────────────────────────────────
export async function login(data: {
  email: string;
  password: string;
  deviceInfo?: string;
  correlationId: string;
}) {
  const user = await prisma.user.findUnique({
    where: { email: data.email.toLowerCase().trim() },
  });

  // Same error for "user not found" and "wrong password"
  // This prevents user enumeration attacks
  if (!user || !user.isActive) {
    // Emit the failure event before throwing
    appEvents.emit(AUTH_EVENTS.LOGIN_FAILED, {
      correlationId: data.correlationId,
      email: data.email,
      deviceInfo: data.deviceInfo,
      reason: 'user_not_found',
    });
    throw new AppError(401, 'Invalid credentials');
  }

  const valid = await verifyPassword(data.password, user.passwordHash);
  if (!valid) {
    appEvents.emit(AUTH_EVENTS.LOGIN_FAILED, {
      correlationId: data.correlationId,
      email: data.email,
      deviceInfo: data.deviceInfo,
      reason: 'wrong_password',
    });
    throw new AppError(401, 'Invalid credentials');
  }

  // Generate tokens
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  // Store the refresh token hash (never store the raw token)
  const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      token: tokenHash,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  logger.info('User logged in', { correlationId: data.correlationId, userId: user.id });

  // Emit success event
  appEvents.emit(AUTH_EVENTS.USER_LOGGED_IN, {
    correlationId: data.correlationId,
    userId: user.id,
    deviceInfo: data.deviceInfo,
  });

  return {
    accessToken,
    refreshToken,
    user: { id: user.id, email: user.email, tier: user.tier },
  };
}

// ── Refresh ───────────────────────────────────────────────
export async function refresh(rawRefreshToken: string, correlationId: string) {
  // Verify the JWT signature and expiration
  let payload;
  try {
    payload = verifyRefreshToken(rawRefreshToken);
  } catch {
    throw new AppError(401, 'Invalid refresh token');
  }

  if (payload.type !== 'refresh') {
    throw new AppError(401, 'Invalid token type');
  }

  // Check if this token exists in the database (not revoked)
  const tokenHash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');

  const stored = await prisma.refreshToken.findUnique({
    where: { token: tokenHash },
  });

  if (!stored || stored.expiresAt < new Date()) {
    throw new AppError(401, 'Refresh token expired or revoked');
  }

  // Get the user
  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
  });

  if (!user || !user.isActive) {
    throw new AppError(401, 'User not found or inactive');
  }

  // Rotate: delete the old token, create a new one
  await prisma.refreshToken.delete({ where: { token: tokenHash } });

  const newAccessToken = generateAccessToken(user);
  const newRefreshToken = generateRefreshToken(user);
  const newHash = crypto.createHash('sha256').update(newRefreshToken).digest('hex');

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      token: newHash,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  logger.info('Refresh token rotated', { correlationId, userId: user.id });

  return { accessToken: newAccessToken, refreshToken: newRefreshToken };
}

// ── Logout ────────────────────────────────────────────────
export async function logout(rawRefreshToken: string, correlationId: string) {
  const tokenHash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');

  // Delete the token. If it doesn't exist, that's fine.
  const { count } = await prisma.refreshToken.deleteMany({
    where: { token: tokenHash },
  });

  logger.info('User logged out', { correlationId, revokedTokens: count });
}

// ── Used by GET /api/auth/me and the admin routes (not part of the lesson) ──
function toPublicUser({ passwordHash: _passwordHash, ...user }: User) {
  return user;
}

export async function getCurrentUser(userId: string) {
  const user = await userRepository.findById(userId);
  if (!user || user.deletedAt) throw new AppError(404, 'User not found');
  return toPublicUser(user);
}

export async function listUsers() {
  const users = await userRepository.list();
  return users.map(toPublicUser);
}

export function countUsers() {
  return userRepository.count();
}
