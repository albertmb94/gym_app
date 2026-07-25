import crypto from 'node:crypto';

const SCRYPT_KEYLEN = 64;
const SCRYPT_SALT_BYTES = 16;

export function hashToken(token: string): string {
  const salt = crypto.randomBytes(SCRYPT_SALT_BYTES);
  const derived = crypto.scryptSync(token, salt, SCRYPT_KEYLEN, { N: 16384, r: 8, p: 1 });
  return `scrypt$${salt.toString('hex')}$${derived.toString('hex')}`;
}

export function verifyToken(token: string, stored: string): boolean {
  if (!stored.startsWith('scrypt$')) return false;
  const parts = stored.split('$');
  if (parts.length !== 3) return false;
  const [, saltHex, hashHex] = parts;
  let salt: Buffer;
  let expected: Buffer;
  try {
    salt = Buffer.from(saltHex, 'hex');
    expected = Buffer.from(hashHex, 'hex');
  } catch {
    return false;
  }
  if (salt.length !== SCRYPT_SALT_BYTES || expected.length !== SCRYPT_KEYLEN) return false;
  const derived = crypto.scryptSync(token, salt, SCRYPT_KEYLEN, { N: 16384, r: 8, p: 1 });
  if (derived.length !== expected.length) return false;
  return crypto.timingSafeEqual(derived, expected);
}

export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}

export function generateRecoveryCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.randomBytes(12);
  let out = '';
  for (let i = 0; i < 12; i++) out += chars[bytes[i] % chars.length];
  return `${out.slice(0, 4)}-${out.slice(4, 8)}-${out.slice(8, 12)}`;
}

export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase().normalize('NFKC');
}

export function isValidUsername(s: string): boolean {
  if (!s || s.length < 2 || s.length > 32) return false;
  return /^[a-z0-9._-]+$/.test(s);
}

export function isValidToken(s: string): boolean {
  return typeof s === 'string' && s.length >= 8 && s.length <= 128;
}