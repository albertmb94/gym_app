import { describe, it, expect } from 'vitest';
import { hashToken, verifyToken, normalizeUsername, isValidUsername, generateRecoveryCode } from './crypto';

describe('crypto utils', () => {
  it('hashes and verifies a token', () => {
    const token = 'mySecretPassword123';
    const hash = hashToken(token);
    expect(hash).toContain('scrypt$');
    expect(verifyToken(token, hash)).toBe(true);
    expect(verifyToken('wrongToken', hash)).toBe(false);
  });

  it('rejects malformed hashes', () => {
    expect(verifyToken('any', 'invalid')).toBe(false);
    expect(verifyToken('any', 'scrypt$badhex$morebadhex')).toBe(false);
  });

  it('normalizes usernames', () => {
    expect(normalizeUsername('  Alice  ')).toBe('alice');
    expect(normalizeUsername('ÁLICE')).toBe('álice');
  });

  it('validates usernames', () => {
    expect(isValidUsername('alice')).toBe(true);
    expect(isValidUsername('a')).toBe(false);
    expect(isValidUsername('a'.repeat(33))).toBe(false);
    expect(isValidUsername('alice!')).toBe(false);
    expect(isValidUsername('alice_2025')).toBe(true);
  });

  it('generates recovery codes in expected format', () => {
    const code = generateRecoveryCode();
    expect(code).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
  });
});