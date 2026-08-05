import crypto from 'node:crypto';

// Sesiones stateless firmadas con HMAC.
// Formato del token: <sessionId>.<expiry>.<signature>
// Firma: HMAC-SHA256(serverSecret, `${sessionId}.${expiry}.${username}`)

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 días
const DEFAULT_SECRET = 'gymtracker-dev-secret-change-in-prod';

function getSecret(): string {
  return process.env.SESSION_SECRET || process.env.ADMIN_RESET_TOKEN || DEFAULT_SECRET;
}

function b64url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function _b64urlDecode(s: string): Buffer {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4));
  return Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/') + pad, 'base64');
}

void _b64urlDecode;

export function generateSessionToken(username: string): string {
  const sessionId = b64url(crypto.randomBytes(16));
  const expiry = Date.now() + SESSION_TTL_MS;
  const payload = `${sessionId}.${expiry}.${username}`;
  const sig = b64url(crypto.createHmac('sha256', getSecret()).update(payload).digest());
  return `${sessionId}.${expiry}.${sig}`;
}

export function verifySessionToken(username: string, token: string): boolean {
  if (!token || typeof token !== 'string') return false;
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  const [sessionId, expiryStr, sig] = parts;
  const expiry = Number(expiryStr);
  if (!Number.isFinite(expiry) || expiry < Date.now()) return false;
  if (!sessionId || !sig) return false;
  const payload = `${sessionId}.${expiry}.${username}`;
  const expected = b64url(crypto.createHmac('sha256', getSecret()).update(payload).digest());
  // timing-safe comparison
  if (sig.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < sig.length; i++) {
    diff |= sig.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}
