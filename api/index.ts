import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
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

export const app = express();

app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

app.use(cors({
  origin: (origin, callback) => {
    if (!env.ALLOWED_ORIGIN) {
      return callback(new Error('CORS misconfigured: ALLOWED_ORIGIN must be set'));
    }
    if (!origin || origin === env.ALLOWED_ORIGIN) {
      return callback(null, true);
    }
    return callback(new Error('Origin not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'PUT', 'POST'],
  maxAge: 600,
}));

app.use(express.json({ limit: `${env.API_MAX_BODY_MB}mb` }));

const authLimiter = rateLimit({
  windowMs: 60_000,
  max: env.AUTH_RATE_LIMIT_PER_MIN,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many auth attempts, please try again later' },
});

const syncLimiter = rateLimit({
  windowMs: 60_000,
  max: env.SYNC_RATE_LIMIT_PER_MIN,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please slow down' },
});

app.use(async (_req, _res, next) => {
  try {
    await initDb();
    next();
  } catch (err) {
    next(err);
  }
});

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    hasDb: Boolean(env.TURSO_DATABASE_URL),
    revision: env.NODE_ENV,
  });
});

const registerSchema = z.object({
  username: z.string().min(2).max(32),
  token: z.string().min(8).max(128),
  data: userDataSchema,
});

app.post('/api/auth/register', authLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid request', details: parsed.error.issues });
    }
    const username = normalizeUsername(parsed.data.username);
    if (!isValidUsername(username)) {
      return res.status(400).json({ error: 'Invalid username format' });
    }
    if (!isValidToken(parsed.data.token)) {
      return res.status(400).json({ error: 'Token must be 8-128 characters' });
    }
    const existing = await findUserRow(username);
    if (existing) {
      return res.status(409).json({ error: 'Username already taken' });
    }
    const tokenHash = hashToken(parsed.data.token);
    const recoveryCode = generateRecoveryCode();
    const recoveryHash = hashToken(recoveryCode);
    const now = Date.now();
    const sanitizedData = sanitizeUserData(parsed.data.data);
    await insertUserWithToken(username, tokenHash, JSON.stringify(sanitizedData), now);
    await rotateToken(username, tokenHash, recoveryHash);
    const session = generateSessionToken();
    res.status(201).json({
      ok: true,
      username,
      session,
      recoveryCode,
      revision: 1,
    });
  } catch (err) {
    next(err);
  }
});

const loginSchema = z.object({
  username: z.string().min(2).max(32),
  token: z.string().min(8).max(128),
});

app.post('/api/auth/login', authLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid request' });
    }
    const username = normalizeUsername(parsed.data.username);
    if (!isValidUsername(username)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const row = await findUserRow(username);
    if (!row || !verifyToken(parsed.data.token, row.token_hash)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const session = generateSessionToken();
    res.json({
      ok: true,
      username,
      session,
      revision: row.revision,
      updatedAt: row.updated_at,
    });
  } catch (err) {
    next(err);
  }
});

const recoverySchema = z.object({
  username: z.string().min(2).max(32),
  recoveryCode: z.string().regex(/^[A-Z0-9-]{14}$/),
  newToken: z.string().min(8).max(128),
});

app.post('/api/auth/recover', authLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = recoverySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid request' });
    }
    const username = normalizeUsername(parsed.data.username);
    const row = await findUserRow(username);
    if (!row || !row.recovery_code_hash || !verifyToken(parsed.data.recoveryCode, row.recovery_code_hash)) {
      return res.status(401).json({ error: 'Invalid recovery code' });
    }
    const newTokenHash = hashToken(parsed.data.newToken);
    await rotateToken(username, newTokenHash, row.recovery_code_hash);
    const session = generateSessionToken();
    res.json({ ok: true, username, session });
  } catch (err) {
    next(err);
  }
});

function authenticate(req: Request, res: Response, next: NextFunction) {
  const paramValue = req.params.username;
  const username = normalizeUsername(typeof paramValue === 'string' ? paramValue : '');
  if (!isValidUsername(username)) {
    return res.status(400).json({ error: 'Invalid username' });
  }
  const authHeader = req.headers.authorization;
  const auth = typeof authHeader === 'string' ? authHeader : '';
  const [scheme, token] = auth.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  findUserRow(username).then((row) => {
    if (!row || !verifyToken(token, row.token_hash)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    (req as any).user = { username, revision: row.revision, updatedAt: row.updated_at };
    next();
  }).catch(next);
}

app.get('/api/data/:username', authenticate, syncLimiter, async (req: Request, res: Response) => {
  try {
    const username = (req as any).user.username as string;
    const row = await findUserRow(username);
    if (!row) return res.status(404).json({ error: 'Not found' });
    let parsed: unknown;
    try {
      parsed = JSON.parse(row.data);
    } catch {
      return res.status(500).json({ error: 'Corrupted data' });
    }
    res.json({
      data: parsed,
      revision: row.revision,
      updatedAt: row.updated_at,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to read' });
  }
});

const pushSchema = z.object({
  data: userDataSchema,
  expectedRevision: z.number().int().min(0),
});

app.put('/api/data/:username', authenticate, syncLimiter, async (req: Request, res: Response) => {
  try {
    const username = (req as any).user.username as string;
    const parsed = pushSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid data', details: parsed.error.issues });
    }
    const sanitized = sanitizeUserData(parsed.data.data);
    const json = JSON.stringify(sanitized);
    const newRevision = parsed.data.expectedRevision + 1;
    const now = Date.now();
    const result = await updateUserWithCas(
      username,
      parsed.data.expectedRevision,
      newRevision,
      json,
      null,
      now,
    );
    if (!result.ok) {
      const current = await findUserRow(username);
      return res.status(409).json({
        error: 'Conflict',
        actualRevision: result.actualRevision ?? current?.revision ?? 0,
        serverData: current ? safeParse(current.data) : null,
        updatedAt: current?.updated_at ?? 0,
      });
    }
    res.json({
      ok: true,
      revision: newRevision,
      updatedAt: now,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to write' });
  }
});

function safeParse(data: string): unknown {
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

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
  return {
    users,
    sessions,
    cardioSessions,
    revision: data.revision,
  };
}

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[api] error:', err.message);
  if (res.headersSent) return;
  res.status(500).json({ error: 'Internal server error' });
});

export default app;