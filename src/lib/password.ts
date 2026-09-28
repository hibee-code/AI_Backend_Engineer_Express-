import bcrypt from 'bcrypt';
import { config } from './config';

// 12 by default (≈250ms per hash). Configurable via BCRYPT_SALT_ROUNDS.
const SALT_ROUNDS = config.BCRYPT_SALT_ROUNDS;

export async function hashPassword(plaintext: string): Promise<string> {
  return bcrypt.hash(plaintext, SALT_ROUNDS);
}

// bcrypt.compare is constant-time. Never compare hashes with ===.
export async function verifyPassword(plaintext: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plaintext, hash);
}
