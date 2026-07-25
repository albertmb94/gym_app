import type { AppData } from '../types';

export type SyncState =
  | { kind: 'idle' }
  | { kind: 'pulling' }
  | { kind: 'pushing'; queued: boolean }
  | { kind: 'synced'; revision: number; updatedAt: number }
  | { kind: 'conflict'; serverRevision: number; serverData: AppData | null; serverUpdatedAt: number }
  | { kind: 'error'; reason: string }
  | { kind: 'offline' };

let serverAvailable: { value: boolean; expiresAt: number } | null = null;
const SERVER_TTL_MS = 30_000;

export async function isServerAvailable(): Promise<boolean> {
  if (serverAvailable && serverAvailable.expiresAt > Date.now()) {
    return serverAvailable.value;
  }
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 4000);
    const r = await fetch('/api/health', { signal: ctrl.signal });
    clearTimeout(t);
    const j = await r.json().catch(() => ({}));
    const ok = !!(r.ok && j.ok);
    serverAvailable = { value: ok, expiresAt: Date.now() + SERVER_TTL_MS };
    return ok;
  } catch {
    serverAvailable = { value: false, expiresAt: Date.now() + SERVER_TTL_MS };
    return false;
  }
}

export function invalidateServerCache(): void {
  serverAvailable = null;
}

export type SyncResult<T> =
  | { ok: true; data: T }
  | { ok: false; kind: 'unauthorized' | 'notFound' | 'conflict' | 'offline' | 'serverError' | 'invalid'; message: string; serverRevision?: number; serverData?: AppData | null; serverUpdatedAt?: number };

export async function authRegister(
  username: string,
  token: string,
  data: AppData,
): Promise<SyncResult<{ username: string; session: string; recoveryCode: string; revision: number }>> {
  if (!(await isServerAvailable())) {
    return { ok: false, kind: 'offline', message: 'Server not available' };
  }
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 10_000);
    const r = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, token, data }),
      signal: ctrl.signal,
    });
    clearTimeout(t);
    if (r.status === 409) return { ok: false, kind: 'conflict', message: 'Username already taken' };
    if (!r.ok) {
      const err = await r.json().catch(() => ({}));
      return { ok: false, kind: 'serverError', message: err.error || `HTTP ${r.status}` };
    }
    const j = await r.json();
    return { ok: true, data: j };
  } catch (err: any) {
    if (err?.name === 'AbortError') return { ok: false, kind: 'offline', message: 'Request timed out' };
    return { ok: false, kind: 'offline', message: 'Network error' };
  }
}

export async function authLogin(
  username: string,
  token: string,
): Promise<SyncResult<{ username: string; session: string; revision: number; updatedAt: number }>> {
  if (!(await isServerAvailable())) {
    return { ok: false, kind: 'offline', message: 'Server not available' };
  }
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 10_000);
    const r = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, token }),
      signal: ctrl.signal,
    });
    clearTimeout(t);
    if (r.status === 401) return { ok: false, kind: 'unauthorized', message: 'Invalid credentials' };
    if (!r.ok) {
      const err = await r.json().catch(() => ({}));
      return { ok: false, kind: 'serverError', message: err.error || `HTTP ${r.status}` };
    }
    const j = await r.json();
    return { ok: true, data: j };
  } catch {
    return { ok: false, kind: 'offline', message: 'Network error' };
  }
}

export async function fetchUserData(
  username: string,
  token: string,
): Promise<SyncResult<{ data: AppData; revision: number; updatedAt: number }>> {
  if (!(await isServerAvailable())) {
    return { ok: false, kind: 'offline', message: 'Server not available' };
  }
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 10_000);
    const r = await fetch(`/api/data/${encodeURIComponent(username)}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: ctrl.signal,
    });
    clearTimeout(t);
    if (r.status === 401) return { ok: false, kind: 'unauthorized', message: 'Invalid credentials' };
    if (r.status === 404) return { ok: false, kind: 'notFound', message: 'No remote data' };
    if (!r.ok) {
      const err = await r.json().catch(() => ({}));
      return { ok: false, kind: 'serverError', message: err.error || `HTTP ${r.status}` };
    }
    const j = await r.json();
    return { ok: true, data: j };
  } catch {
    return { ok: false, kind: 'offline', message: 'Network error' };
  }
}

export async function pushUserData(
  username: string,
  token: string,
  data: AppData,
  expectedRevision: number,
): Promise<SyncResult<{ revision: number; updatedAt: number }>> {
  if (!(await isServerAvailable())) {
    return { ok: false, kind: 'offline', message: 'Server not available' };
  }
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 15_000);
    const r = await fetch(`/api/data/${encodeURIComponent(username)}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ data, expectedRevision }),
      signal: ctrl.signal,
    });
    clearTimeout(t);
    if (r.status === 401) return { ok: false, kind: 'unauthorized', message: 'Invalid credentials' };
    if (r.status === 409) {
      const err = await r.json().catch(() => ({}));
      return {
        ok: false,
        kind: 'conflict',
        message: 'Remote has newer data',
        serverRevision: err.actualRevision,
        serverData: err.serverData,
        serverUpdatedAt: err.updatedAt,
      };
    }
    if (!r.ok) {
      const err = await r.json().catch(() => ({}));
      return { ok: false, kind: 'serverError', message: err.error || `HTTP ${r.status}` };
    }
    const j = await r.json();
    return { ok: true, data: j };
  } catch {
    return { ok: false, kind: 'offline', message: 'Network error' };
  }
}