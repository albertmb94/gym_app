import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { getEnv } from './env.js';
import {
  hashToken,
  verifyToken,
  generateSessionToken,
  generateRecoveryCode,
  normalizeUsername,
  isValidUsername,
  isValidToken,
} from './crypto.js';
import { findUserRow, initDb, insertUserWithToken, rotateToken, updateUserWithCas } from './db.js';
import { userDataSchema, UserData } from './schemas.js';

const env = getEnv();

async function readJson(req: VercelRequest): Promise<unknown> {
  if (req.body !== undefined) return req.body;
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => chunks.push(c));
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8');
        resolve(raw ? JSON.parse(raw) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

function send(res: VercelResponse, status: number, body: unknown) {
  res.status(status).json(body);
}

function notFound(res: VercelResponse) {
  send(res, 404, { error: 'Not found' });
}

function requireDb(res: VercelResponse): boolean {
  if (!env.dbConfigured) {
    send(res, 503, {
      error: 'Database not configured',
      message: 'Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN in Vercel environment variables, then redeploy.',
    });
    return false;
  }
  return true;
}

async function ensureDb() {
  await initDb();
}

const registerSchema = z.object({
  username: z.string().min(2).max(32),
  token: z.string().min(8).max(128),
  data: userDataSchema,
});

const loginSchema = z.object({
  username: z.string().min(2).max(32),
  token: z.string().min(8).max(128),
});

const recoverySchema = z.object({
  username: z.string().min(2).max(32),
  recoveryCode: z.string().regex(/^[A-Z0-9-]{14}$/),
  newToken: z.string().min(8).max(128),
});

const pushSchema = z.object({
  data: userDataSchema,
  expectedRevision: z.number().int().min(0),
});

function sanitizeUserData(data: UserData): UserData {
  const allowedKeys = new Set([normalizeUsername(Object.keys(data.users)[0] || '')]);
  const users: Record<string, typeof data.users[string]> = {};
  for (const [key, value] of Object.entries(data.users)) {
    const norm = normalizeUsername(key);
    if (allowedKeys.has(norm) && value.username.toLowerCase() === norm) {
      users[norm] = { ...value, username: norm };
    }
  }
  const target = Object.keys(users)[0];
  const sessions = target && data.sessions[target] ? { [target]: data.sessions[target] } : {};
  const cardioSessions = target && data.cardioSessions[target] ? { [target]: data.cardioSessions[target] } : {};
  return { users, sessions, cardioSessions, revision: data.revision };
}

function safeParse(data: string): unknown {
  try { return JSON.parse(data); } catch { return null; }
}

const dataUsernamePattern = /^\/api\/data\/([^/]+)$/;
const rateBuckets = new Map<string, { count: number; resetAt: number }>();

function rateLimit(bucket: string, max: number): boolean {
  const now = Date.now();
  const b = rateBuckets.get(bucket);
  if (!b || b.resetAt < now) {
    rateBuckets.set(bucket, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (b.count >= max) return false;
  b.count++;
  return true;
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function requireAdmin(req: VercelRequest, res: VercelResponse): boolean {
  if (!env.ADMIN_RESET_TOKEN) {
    send(res, 503, { error: 'Admin endpoint disabled: set ADMIN_RESET_TOKEN in Vercel environment variables' });
    return false;
  }
  const header = req.headers['x-admin-token'];
  const token = typeof header === 'string' ? header : '';
  if (!token || !timingSafeEqual(token, env.ADMIN_RESET_TOKEN)) {
    send(res, 401, { error: 'Invalid admin token' });
    return false;
  }
  return true;
}

async function handleAdminGetData(req: VercelRequest, res: VercelResponse) {
  if (!requireAdmin(req, res)) return;
  if (!requireDb(res)) return;
  try {
    await ensureDb();
    const body = await readJson(req) as { username?: unknown };
    const rawUsername = typeof body?.username === 'string' ? body.username : '';
    const username = normalizeUsername(rawUsername);
    if (!isValidUsername(username)) {
      return send(res, 400, { error: 'Invalid username' });
    }
    const { getDb } = await import('./db.js');
    const result = await getDb().execute({
      sql: 'SELECT data, revision, updated_at FROM users WHERE username = ?',
      args: [username],
    });
    const row = result.rows[0];
    if (!row) return send(res, 404, { error: 'User not found' });
    const dataStr = String(row.data ?? '');
    let parsed: unknown = null;
    try { parsed = JSON.parse(dataStr); } catch { /* ignore */ }
    send(res, 200, {
      username,
      revision: Number(row.revision ?? 0),
      updated_at: Number(row.updated_at ?? 0),
      data_bytes: dataStr.length,
      data: parsed,
    });
  } catch (err) {
    console.error('[api] admin get-data error:', err);
    send(res, 500, { error: 'Failed to read', message: err instanceof Error ? err.message : String(err) });
  }
}

async function handleAdminListUsers(req: VercelRequest, res: VercelResponse) {
  if (!requireAdmin(req, res)) return;
  if (!requireDb(res)) return;
  try {
    await ensureDb();
    const { getDb } = await import('./db.js');
    const result = await getDb().execute('SELECT username, revision, updated_at, length(data) as data_len, token_hash IS NOT NULL as has_hash FROM users');
    send(res, 200, { users: result.rows });
  } catch (err) {
    console.error('[api] admin list error:', err);
    send(res, 500, { error: 'Failed to list', message: err instanceof Error ? err.message : String(err) });
  }
}

async function handleAdminRestoreData(req: VercelRequest, res: VercelResponse) {
  if (!requireAdmin(req, res)) return;
  if (!requireDb(res)) return;
  try {
    const body = await readJson(req) as { username?: unknown; data?: unknown };
    const rawUsername = typeof body?.username === 'string' ? body.username : '';
    const username = normalizeUsername(rawUsername);
    if (!isValidUsername(username)) {
      return send(res, 400, { error: 'Invalid username format' });
    }
    if (!body?.data || typeof body.data !== 'object') {
      return send(res, 400, { error: 'Missing "data" object' });
    }
    const dataObj = body.data as Record<string, unknown>;
    if (!dataObj.users || typeof dataObj.users !== 'object') {
      return send(res, 400, { error: 'data.users must be an object' });
    }
    if (!dataObj.sessions || typeof dataObj.sessions !== 'object') {
      return send(res, 400, { error: 'data.sessions must be an object' });
    }
    if (!dataObj.cardioSessions || typeof dataObj.cardioSessions !== 'object') {
      return send(res, 400, { error: 'data.cardioSessions must be an object' });
    }
    await ensureDb();
    const row = await findUserRow(username);
    if (!row) {
      return send(res, 404, { error: 'User not found. Register the user first, then restore.' });
    }
    const json = JSON.stringify(dataObj);
    const now = Date.now();
    const newRevision = row.revision + 1;
    const { getDb } = await import('./db.js');
    await getDb().execute({
      sql: 'UPDATE users SET data = ?, revision = ?, updated_at = ? WHERE username = ? AND revision = ?',
      args: [json, newRevision, now, username, row.revision],
    });
    console.log(`[api] admin restored data for "${username}" (${json.length} bytes, revision ${newRevision})`);
    send(res, 200, { ok: true, username, revision: newRevision, bytes: json.length });
  } catch (err) {
    console.error('[api] admin restore error:', err);
    send(res, 500, { error: 'Failed to restore', message: err instanceof Error ? err.message : String(err) });
  }
}

async function handleAdminResetPassword(req: VercelRequest, res: VercelResponse) {
  if (!requireAdmin(req, res)) return;
  if (!requireDb(res)) return;
  try {
    const body = await readJson(req) as { username?: unknown; newPassword?: unknown };
    const rawUsername = typeof body?.username === 'string' ? body.username : '';
    const newPassword = typeof body?.newPassword === 'string' ? body.newPassword : '';
    const username = normalizeUsername(rawUsername);
    if (!isValidUsername(username)) {
      return send(res, 400, { error: 'Invalid username format' });
    }
    if (!isValidToken(newPassword)) {
      return send(res, 400, { error: 'newPassword must be 8-128 characters' });
    }
    await ensureDb();
    const row = await findUserRow(username);
    if (!row) {
      return send(res, 404, { error: 'User not found', username });
    }
    const tokenHash = hashToken(newPassword);
    const now = Date.now();
    const { getDb } = await import('./db.js');
    await getDb().execute({
      sql: 'UPDATE users SET token_hash = ?, updated_at = ? WHERE username = ?',
      args: [tokenHash, now, username],
    });
    console.log(`[api] admin reset password for "${username}"`);
    send(res, 200, { ok: true, username, resetAt: now });
  } catch (err) {
    console.error('[api] admin reset error:', err);
    send(res, 500, { error: 'Failed to reset password', message: err instanceof Error ? err.message : String(err) });
  }
}

async function handleHealth(_req: VercelRequest, res: VercelResponse) {
  send(res, 200, {
    ok: env.dbConfigured,
    hasDb: env.dbConfigured,
    revision: env.NODE_ENV,
  });
}

async function handleRegister(req: VercelRequest, res: VercelResponse) {
  if (!requireDb(res)) return;
  if (!rateLimit('auth', env.AUTH_RATE_LIMIT_PER_MIN)) return send(res, 429, { error: 'Too many auth attempts' });
  try {
    const body = await readJson(req);
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) return send(res, 400, { error: 'Invalid request', details: parsed.error.issues });
    const username = normalizeUsername(parsed.data.username);
    if (!isValidUsername(username)) return send(res, 400, { error: 'Invalid username format' });
    if (!isValidToken(parsed.data.token)) return send(res, 400, { error: 'Token must be 8-128 characters' });
    await ensureDb();
    const existing = await findUserRow(username);
    if (existing) return send(res, 409, { error: 'Username already taken' });
    const tokenHash = hashToken(parsed.data.token);
    const recoveryCode = generateRecoveryCode();
    const recoveryHash = hashToken(recoveryCode);
    const now = Date.now();
    const sanitized = sanitizeUserData(parsed.data.data);
    await insertUserWithToken(username, tokenHash, JSON.stringify(sanitized), now);
    await rotateToken(username, tokenHash, recoveryHash);
    const session = generateSessionToken();
    send(res, 201, { ok: true, username, session, recoveryCode, revision: 1 });
  } catch (err) {
    console.error('[api] register error:', err);
    send(res, 500, { error: 'Internal server error' });
  }
}

async function handleLogin(req: VercelRequest, res: VercelResponse) {
  if (!requireDb(res)) return;
  if (!rateLimit('auth', env.AUTH_RATE_LIMIT_PER_MIN)) return send(res, 429, { error: 'Too many auth attempts' });
  try {
    const body = await readJson(req);
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) return send(res, 400, { error: 'Invalid request' });
    const username = normalizeUsername(parsed.data.username);
    if (!isValidUsername(username)) return send(res, 401, { error: 'Invalid credentials' });
    await ensureDb();
    const row = await findUserRow(username);
    if (!row || !verifyToken(parsed.data.token, row.token_hash)) {
      return send(res, 401, { error: 'Invalid credentials' });
    }
    const session = generateSessionToken();
    send(res, 200, { ok: true, username, session, revision: row.revision, updatedAt: row.updated_at });
  } catch (err) {
    console.error('[api] login error:', err);
    send(res, 500, { error: 'Internal server error' });
  }
}

async function handleRecover(req: VercelRequest, res: VercelResponse) {
  if (!requireDb(res)) return;
  if (!rateLimit('auth', env.AUTH_RATE_LIMIT_PER_MIN)) return send(res, 429, { error: 'Too many auth attempts' });
  try {
    const body = await readJson(req);
    const parsed = recoverySchema.safeParse(body);
    if (!parsed.success) return send(res, 400, { error: 'Invalid request' });
    const username = normalizeUsername(parsed.data.username);
    await ensureDb();
    const row = await findUserRow(username);
    if (!row || !row.recovery_code_hash || !verifyToken(parsed.data.recoveryCode, row.recovery_code_hash)) {
      return send(res, 401, { error: 'Invalid recovery code' });
    }
    const newTokenHash = hashToken(parsed.data.newToken);
    await rotateToken(username, newTokenHash, row.recovery_code_hash);
    const session = generateSessionToken();
    send(res, 200, { ok: true, username, session });
  } catch (err) {
    console.error('[api] recover error:', err);
    send(res, 500, { error: 'Internal server error' });
  }
}

async function authenticate(req: VercelRequest, res: VercelResponse): Promise<string | null> {
  const rawAuth = req.headers.authorization;
  const auth = Array.isArray(rawAuth) ? rawAuth[0] : (typeof rawAuth === 'string' ? rawAuth : '');
  const [scheme, token] = auth.split(' ');
  if (!scheme || scheme.toLowerCase() !== 'bearer' || !token) {
    console.log('[api] auth fail: header=', JSON.stringify(auth).slice(0, 50));
    send(res, 401, { error: 'Authentication required' });
    return null;
  }
  const usernameParam = (req as any)._username;
  if (typeof usernameParam !== 'string') {
    send(res, 400, { error: 'Invalid username' });
    return null;
  }
  const username = normalizeUsername(usernameParam);
  if (!isValidUsername(username)) {
    send(res, 400, { error: 'Invalid username' });
    return null;
  }
  await ensureDb();
  const row = await findUserRow(username);
  if (!row) {
    console.log('[api] auth fail: user not found', username);
    send(res, 401, { error: 'Invalid credentials' });
    return null;
  }
  if (!verifyToken(token, row.token_hash)) {
    console.log('[api] auth fail: bad token for', username);
    send(res, 401, { error: 'Invalid credentials' });
    return null;
  }
  (req as any).user = { username, revision: row.revision, updatedAt: row.updated_at };
  return username;
}

async function handleGetData(req: VercelRequest, res: VercelResponse) {
  if (!requireDb(res)) return;
  if (!rateLimit('sync', env.SYNC_RATE_LIMIT_PER_MIN)) return send(res, 429, { error: 'Too many requests' });
  const username = await authenticate(req, res);
  if (!username) return;
  try {
    const row = await findUserRow(username);
    if (!row) return send(res, 404, { error: 'Not found' });
    let parsed: unknown;
    try { parsed = JSON.parse(row.data); } catch { return send(res, 500, { error: 'Corrupted data' }); }
    send(res, 200, { data: parsed, revision: row.revision, updatedAt: row.updated_at });
  } catch (err) {
    console.error('[api] getData error:', err);
    send(res, 500, { error: 'Failed to read' });
  }
}

async function handlePutData(req: VercelRequest, res: VercelResponse) {
  if (!requireDb(res)) return;
  if (!rateLimit('sync', env.SYNC_RATE_LIMIT_PER_MIN)) return send(res, 429, { error: 'Too many requests' });
  const username = await authenticate(req, res);
  if (!username) return;
  try {
    const body = await readJson(req);
    const parsed = pushSchema.safeParse(body);
    if (!parsed.success) return send(res, 400, { error: 'Invalid data', details: parsed.error.issues });
    const sanitized = sanitizeUserData(parsed.data.data);
    const json = JSON.stringify(sanitized);
    const newRevision = parsed.data.expectedRevision + 1;
    const now = Date.now();
    const result = await updateUserWithCas(username, parsed.data.expectedRevision, newRevision, json, null, now);
    if (!result.ok) {
      const current = await findUserRow(username);
      return send(res, 409, {
        error: 'Conflict',
        actualRevision: result.actualRevision ?? current?.revision ?? 0,
        serverData: current ? safeParse(current.data) : null,
        updatedAt: current?.updated_at ?? 0,
      });
    }
    send(res, 200, { ok: true, revision: newRevision, updatedAt: now });
  } catch (err) {
    console.error('[api] putData error:', err);
    send(res, 500, { error: 'Failed to write' });
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const url = req.url || '';
  const method = (req.method || 'GET').toUpperCase();
  console.log('[api] req', method, url, 'origin=', req.headers.origin);

  const origin = req.headers.origin;
  const allowedOrigin = env.ALLOWED_ORIGIN;
  // Si hay ALLOWED_ORIGIN configurado, usarlo. Si no, hacer echo del Origin para soportar credenciales.
  const corsOrigin = allowedOrigin || origin || '*';
  res.setHeader('Access-Control-Allow-Origin', corsOrigin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '600');

  if (method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (method === 'GET' && url === '/api' || url === '/api/' || url === '/api/health') {
    return handleHealth(req, res);
  }

  if (method === 'POST' && url === '/api/auth/register') {
    return handleRegister(req, res);
  }
  if (method === 'POST' && url === '/api/auth/login') {
    return handleLogin(req, res);
  }
  if (method === 'POST' && url === '/api/auth/recover') {
    return handleRecover(req, res);
  }
  if (method === 'POST' && url === '/api/admin/reset-password') {
    return handleAdminResetPassword(req, res);
  }
  if (method === 'POST' && url === '/api/admin/restore-data') {
    return handleAdminRestoreData(req, res);
  }
  if (method === 'GET' && url === '/api/admin/list-users') {
    return handleAdminListUsers(req, res);
  }
  if (method === 'POST' && url === '/api/admin/get-data') {
    return handleAdminGetData(req, res);
  }

  const dataMatch = url.match(dataUsernamePattern);
  if (dataMatch) {
    (req as any)._username = decodeURIComponent(dataMatch[1]);
    if (method === 'GET') return handleGetData(req, res);
    if (method === 'PUT') return handlePutData(req, res);
  }

  notFound(res);
}
