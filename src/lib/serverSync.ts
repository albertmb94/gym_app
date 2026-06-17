// Lightweight server sync layer. Uses the /api endpoints if available.
// Falls back silently to localStorage-only mode when no server is present.

import { AppData } from '../types';

let serverAvailable: boolean | null = null;

async function checkServer(): Promise<boolean> {
  if (serverAvailable !== null) return serverAvailable;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 4000);
    const r = await fetch('/api/health', { signal: ctrl.signal });
    clearTimeout(t);
    const j = await r.json().catch(() => ({}));
    serverAvailable = !!(r.ok && j.ok && j.hasDb);
  } catch {
    serverAvailable = false;
  }
  return serverAvailable;
}

export async function isServerAvailable(): Promise<boolean> {
  return checkServer();
}

// Fetch a user's full data blob from the server. Returns null if not present.
// Includes the server's `updatedAt` timestamp so the caller can resolve conflicts.
export async function fetchUserData(
  username: string,
  getToken: () => string | null = () => null
): Promise<{ data: { users: AppData['users']; sessions: AppData['sessions']; cardioSessions?: AppData['cardioSessions'] }; updatedAt: number } | null> {
  if (!(await checkServer())) return null;
  try {
    const token = getToken();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const r = await fetch(`/api/data/${encodeURIComponent(username)}`, { headers });
    if (!r.ok) return null;
    const j = await r.json();
    if (!j.data) return null;
    return { data: j.data, updatedAt: Number(j.updatedAt || 0) };
  } catch {
    return null;
  }
}

// Pushes only the slice of AppData that belongs to `username`.
// This is debounced via the caller. Returns the server timestamp on success.
export async function pushUserData(
  username: string,
  appData: AppData,
  getToken: () => string | null = () => null
): Promise<{ ok: boolean; updatedAt?: number }> {
  if (!(await checkServer())) return { ok: false };
  const slice = {
    users: { [username]: appData.users[username] },
    sessions: { [username]: appData.sessions[username] || [] },
    cardioSessions: { [username]: (appData.cardioSessions || {})[username] || [] },
  };
  try {
    const token = getToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const r = await fetch(`/api/data/${encodeURIComponent(username)}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ data: slice }),
    });
    if (!r.ok) return { ok: false };
    const j = await r.json().catch(() => ({}));
    return { ok: true, updatedAt: Number(j.updatedAt || Date.now()) };
  } catch {
    return { ok: false };
  }
}

// Merge a server slice into the current AppData respecting last-write-wins.
// Remote data is applied only when it is newer than `lastSyncedAt`. Local wins
// when it is newer; the caller's push path will upload it later.
export function mergeServerData(
  local: AppData,
  username: string,
  remote: any,
  lastSyncedAt: number
): { merged: AppData; appliedRemote: boolean } {
  if (!remote) return { merged: local, appliedRemote: false };

  if (!remote.updatedAt || remote.updatedAt <= lastSyncedAt) {
    return { merged: local, appliedRemote: false };
  }

  const merged: AppData = {
    users: { ...local.users },
    sessions: { ...local.sessions },
    cardioSessions: { ...(local.cardioSessions || {}) },
  };
  if (remote.users && remote.users[username]) {
    merged.users[username] = remote.users[username];
  }
  if (remote.sessions && remote.sessions[username]) {
    merged.sessions[username] = remote.sessions[username];
  }
  if (remote.cardioSessions && remote.cardioSessions[username]) {
    merged.cardioSessions = merged.cardioSessions || {};
    merged.cardioSessions[username] = remote.cardioSessions[username];
  }
  return { merged, appliedRemote: true };
}
