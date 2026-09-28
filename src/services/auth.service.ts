import bcrypt from 'bcrypt';
import jwt, { type SignOptions } from 'jsonwebtoken';
import type { User } from '../generated/prisma/client';
import { AUTH_EVENTS, type LoginFailedEvent } from '../events/auth.events';
import { config } from '../lib/config';
import { appEvents } from '../lib/events';
import { AppError } from '../middleware/error-handler';
import { userRepository } from '../repositories/user.repository';

// Matches the string values stored in User.role
export type Role = 'user' | 'admin';

export interface AuthPayload {
  sub: string;
  role: Role;
}

// Strip the password hash before a user leaves the service layer
export function toPublicUser({ passwordHash: _passwordHash, ...user }: User) {
  return user;
}

export function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, config.JWT_ACCESS_SECRET, {
    expiresIn: config.JWT_EXPIRES_IN as SignOptions['expiresIn'],
  });
}

export function verifyToken(token: string): AuthPayload {
  try {
    const { sub, role } = jwt.verify(token, config.JWT_ACCESS_SECRET) as jwt.JwtPayload &
      AuthPayload;
    return { sub, role };
  } catch {
    throw new AppError(401, 'Invalid or expired token');
  }
}

export async function register(name: string, email: string, password: string) {
  if (await userRepository.findByEmail(email)) {
    throw new AppError(409, 'Email already registered');
  }

  const passwordHash = await bcrypt.hash(password, config.BCRYPT_SALT_ROUNDS);
  const user = await userRepository.create({ name, email, passwordHash });
  appEvents.emit(AUTH_EVENTS.USER_REGISTERED, { id: user.id, email: user.email, tier: user.tier });

  return {
    user: toPublicUser(user),
    token: signToken({ sub: user.id, role: user.role as Role }),
  };
}

export async function login(email: string, password: string, deviceInfo?: string) {
  const fail = (reason: LoginFailedEvent['reason'], userId?: string): never => {
    appEvents.emit(AUTH_EVENTS.LOGIN_FAILED, { email, reason, userId, deviceInfo });
    throw new AppError(401, 'Invalid email or password');
  };

  const user = await userRepository.findByEmail(email);
  if (!user) return fail('unknown_email');
  if (!user.isActive || user.deletedAt) return fail('inactive_account', user.id);
  if (!(await bcrypt.compare(password, user.passwordHash))) {
    return fail('invalid_password', user.id);
  }

  appEvents.emit(AUTH_EVENTS.USER_LOGGED_IN, { userId: user.id, deviceInfo });
  return { token: signToken({ sub: user.id, role: user.role as Role }) };
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
