import express, { Request, Response } from 'express';
import cors from 'cors';
import { createClient, Client } from '@libsql/client';

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
      updated_at INTEGER NOT NULL
    )
  `);
  initialized = true;
}

// ============================================================================
// EXPRESS APP
// ============================================================================
const app = express();
app.use(cors());
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

  const result = await getDb().execute({
    sql: 'SELECT data, updated_at FROM user_data WHERE username = ?',
    args: [username],
  });
  const row = result.rows[0] as any;
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

  const data = req.body?.data;
  if (data === undefined || data === null) {
    return res.status(400).json({ error: 'Body must contain "data" field' });
  }

  const now = Date.now();
  const json = JSON.stringify(data);
  await getDb().execute({
    sql: `INSERT INTO user_data (username, data, updated_at)
          VALUES (?, ?, ?)
          ON CONFLICT(username) DO UPDATE SET data=excluded.data, updated_at=excluded.updated_at`,
    args: [username, json, now],
  });
  res.json({ ok: true, updatedAt: now });
});

// List all usernames (useful to populate quick-login)
app.get('/api/users', async (_req, res) => {
  const result = await getDb().execute('SELECT username, updated_at FROM user_data ORDER BY username');
  res.json({
    users: result.rows.map((r: any) => ({ username: r.username, updatedAt: Number(r.updated_at) })),
  });
});

// Error handler
app.use((err: any, _req: Request, res: Response, _next: any) => {
  console.error('API error:', err);
  res.status(500).json({ error: err?.message || 'Internal error' });
});

export default app;
