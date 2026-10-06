import { prisma } from '../lib/prisma';
import { appEvents } from '../lib/events';
import { logger, serializeError } from '../lib/logger';

// Event names and payload types live in auth.types.ts (no imports, so lib/events.ts
// can use them without a circular import). Re-exported so callers import from here.
import { AUTH_EVENTS } from './auth.types';
export * from './auth.types';

// ── Register listeners ─────────────────────────────
// Listener 1: Log signups for analytics

appEvents.on(AUTH_EVENTS.USER_REGISTERED, async (user) => {
  try {
    await prisma.usageLog.create({
      data: {
        userId: user.id,
        action: 'signup',
        tokens: 0,
        costUsd: 0,
        metadata: JSON.stringify({
          email: user.email,
          tier: user.tier,
          registeredAt: new Date().toISOString(),
        }),
      },
    });
  } catch (error) {
    // Log but don't crash. This is a side effect.
    logger.error('Failed to record signup', {
      correlationId: user.correlationId,
      userId: user.id,
      error: serializeError(error),
    });
  }
});

// Listener 2: Create a default welcome conversation
appEvents.on(AUTH_EVENTS.USER_REGISTERED, async (user) => {
  try {
    await prisma.conversation.create({
      data: {
        userId: user.id,
        title: 'Welcome to DocuChat',
      },
    });
  } catch (error) {
    logger.error('Failed to create welcome conversation', {
      correlationId: user.correlationId,
      userId: user.id,
      error: serializeError(error),
    });
  }
});
// Listener 3: Log login events (useful for security audits)
appEvents.on(AUTH_EVENTS.USER_LOGGED_IN, async (data) => {
  try {
    await prisma.usageLog.create({
      data: {
        userId: data.userId,
        action: 'login',
        tokens: 0,
        costUsd: 0,
        metadata: JSON.stringify({
          deviceInfo: data.deviceInfo,
          loginAt: new Date().toISOString(),
        }),
      },
    });
  } catch (error) {
    logger.error('Failed to record login', {
      correlationId: data.correlationId,
      userId: data.userId,
      error: serializeError(error),
    });
  }
});
// Listener 4: Track failed login attempts
appEvents.on(AUTH_EVENTS.LOGIN_FAILED, async (data) => {
  try {
    logger.warn('Failed login attempt', {
      correlationId: data.correlationId,
      email: data.email,
      deviceInfo: data.deviceInfo,
      reason: data.reason,
    });
    // In Week 3 we'll add rate limiting based on failed attempts
  } catch (error) {
    logger.error('Failed to record failed login', {
      correlationId: data.correlationId,
      error: serializeError(error),
    });
  }
});
