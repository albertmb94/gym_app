import express, { Request, Response } from 'express';
import cors from 'cors';
import { createClient, Client } from '@libsql/client';
import crypto from 'crypto';

// ============================================================================
// DATABASE (Turso / LibSQL) — simple key-value store per user
// ============================================================================
let db: Client | null = null;
let initialized = false;

function getDb(): Client {
  if (!db) {
    const url = process.env.TURSO_DATABASE_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;
    if (!url) {
      throw new Error(
        'TURSO_DATABASE_URL is not set. Configure it in Vercel project settings.'
      );
    }
    db = createClient({ url, authToken });
  }
  return db;
}

async function initDb() {
  if (initialized) return;
  await getDb().execute(`
    CREATE TABLE IF NOT EXISTS user_data (
      username TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      updated_at INTEGER NOT NULL,
      auth_token_hash TEXT
    )
  `);
  // Backfill existing rows so the column exists with a NULL token hash.
  try {
    await getDb().execute(`ALTER TABLE user_data ADD COLUMN auth_token_hash TEXT`);
  } catch {
    // Column already exists; ignore.
  }
  initialized = true;
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function getAuthToken(req: Request): string | null {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme?.toLowerCase() === 'bearer' && token) return token;
  return null;
}

async function verifyToken(
  username: string,
  token: string | null
): Promise<{ ok: boolean; row?: any }> {
  const result = await getDb().execute({
    sql: 'SELECT data, updated_at, auth_token_hash FROM user_data WHERE username = ?',
    args: [username],
  });
  const row = result.rows[0] as any;
  if (!row) return { ok: true };
  if (!row.auth_token_hash) return { ok: true, row };
  if (!token) return { ok: false };
  const providedHash = hashToken(token);
  return { ok: providedHash === row.auth_token_hash, row };
}

// ============================================================================
// EXPRESS APP
// ============================================================================
const app = express();
app.use(
  cors({
    origin: (origin, callback) => {
      const allowed = process.env.ALLOWED_ORIGIN;
      if (!allowed || !origin || origin === allowed) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
  })
);
app.use(express.json({ limit: '20mb' }));

app.use(async (_req, _res, next) => {
  try {
    await initDb();
    next();
  } catch (err: any) {
    next(err);
  }
});

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, hasDb: !!process.env.TURSO_DATABASE_URL });
});

// Get user's data blob
app.get('/api/data/:username', async (req: Request, res: Response) => {
  const username = (req.params.username || '').trim().toLowerCase();
  if (!username) return res.status(400).json({ error: 'Username required' });

  const token = getAuthToken(req);
  const { ok, row } = await verifyToken(username, token);
  if (!ok) return res.status(401).json({ error: 'Unauthorized' });

  if (!row) {
    return res.json({ data: null, updatedAt: 0 });
  }
  try {
    res.json({ data: JSON.parse(row.data), updatedAt: Number(row.updated_at) });
  } catch {
    res.json({ data: null, updatedAt: 0 });
  }
});

// Save user's data blob (entire app state for that user)
app.put('/api/data/:username', async (req: Request, res: Response) => {
  const username = (req.params.username || '').trim().toLowerCase();
  if (!username) return res.status(400).json({ error: 'Username required' });

  const token = getAuthToken(req);
  const { ok, row } = await verifyToken(username, token);
  if (!ok) return res.status(401).json({ error: 'Unauthorized' });

  const data = req.body?.data;
  if (data === undefined || data === null) {
    return res.status(400).json({ error: 'Body must contain "data" field' });
  }

  const now = Date.now();
  const json = JSON.stringify(data);
  const tokenHash = token ? hashToken(token) : (row?.auth_token_hash || null);
  await getDb().execute({
    sql: `INSERT INTO user_data (username, data, updated_at, auth_token_hash)
          VALUES (?, ?, ?, ?)
          ON CONFLICT(username) DO UPDATE SET data=excluded.data, updated_at=excluded.updated_at, auth_token_hash=excluded.auth_token_hash`,
    args: [username, json, now, tokenHash],
  });
  res.json({ ok: true, updatedAt: now });
});

// Error handler
app.use((err: any, _req: Request, res: Response, _next: any) => {
  console.error('API error:', err);
  res.status(500).json({ error: err?.message || 'Internal error' });
});

export default app;
