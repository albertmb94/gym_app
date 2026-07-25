import { createClient, Client } from '@libsql/client';
import { getEnv } from './env.js';

export interface UserRow {
  username: string;
  revision: number;
  data: string;
  token_hash: string;
  recovery_code_hash: string | null;
  created_at: number;
  updated_at: number;
}

let db: Client | null = null;
let initialized: Promise<void> | null = null;

export function getDb(): Client {
  if (!db) {
    const env = getEnv();
    db = createClient({ url: env.TURSO_DATABASE_URL, authToken: env.TURSO_AUTH_TOKEN });
  }
  return db;
}

export async function initDb(): Promise<void> {
  if (initialized) return initialized;
  initialized = (async () => {
    const client = getDb();
    await client.batch([
      `CREATE TABLE IF NOT EXISTS users (
        username TEXT PRIMARY KEY,
        revision INTEGER NOT NULL DEFAULT 0,
        data TEXT NOT NULL,
        token_hash TEXT NOT NULL,
        recovery_code_hash TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )`,
    ], 'write');
  })();
  await initialized;
}

export async function findUserRow(username: string): Promise<UserRow | null> {
  const result = await getDb().execute({
    sql: 'SELECT username, revision, data, token_hash, recovery_code_hash, created_at, updated_at FROM users WHERE username = ?',
    args: [username],
  });
  const row = result.rows[0];
  if (!row) return null;
  return {
    username: String(row.username),
    revision: Number(row.revision),
    data: String(row.data),
    token_hash: String(row.token_hash),
    recovery_code_hash: row.recovery_code_hash == null ? null : String(row.recovery_code_hash),
    created_at: Number(row.created_at),
    updated_at: Number(row.updated_at),
  };
}

export async function insertUserWithToken(
  username: string,
  tokenHash: string,
  data: string,
  now: number,
): Promise<void> {
  await getDb().execute({
    sql: 'INSERT INTO users (username, revision, data, token_hash, created_at, updated_at) VALUES (?, 1, ?, ?, ?, ?)',
    args: [username, data, tokenHash, now, now],
  });
}

export async function updateUserWithCas(
  username: string,
  expectedRevision: number,
  newRevision: number,
  data: string,
  tokenHash: string | null,
  now: number,
): Promise<{ ok: boolean; actualRevision?: number }> {
  const client = getDb();
  const tx = await client.transaction('write');
  if (tokenHash !== null) {
    await tx.execute({
      sql: 'UPDATE users SET data = ?, revision = ?, updated_at = ?, token_hash = ? WHERE username = ? AND revision = ?',
      args: [data, newRevision, now, tokenHash, username, expectedRevision],
    });
  } else {
    await tx.execute({
      sql: 'UPDATE users SET data = ?, revision = ?, updated_at = ? WHERE username = ? AND revision = ?',
      args: [data, newRevision, now, username, expectedRevision],
    });
  }
  const check = await tx.execute({
    sql: 'SELECT revision FROM users WHERE username = ?',
    args: [username],
  });
  await tx.commit();
  const row = check.rows[0];
  if (!row) return { ok: false };
  const actual = Number(row.revision);
  if (actual !== newRevision) {
    return { ok: false, actualRevision: actual };
  }
  return { ok: true, actualRevision: actual };
}

export async function rotateToken(
  username: string,
  newTokenHash: string,
  newRecoveryHash: string | null,
): Promise<void> {
  await getDb().execute({
    sql: 'UPDATE users SET token_hash = ?, recovery_code_hash = ? WHERE username = ?',
    args: [newTokenHash, newRecoveryHash, username],
  });
}