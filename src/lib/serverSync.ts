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

export async function listServerUsers(): Promise<string[]> {
  if (!(await checkServer())) return [];
  try {
    const r = await fetch('/api/users');
    if (!r.ok) return [];
    const j = await r.json();
    return (j.users || []).map((u: any) => u.username as string);
  } catch {
    return [];
  }
}

// Fetch a user's full data blob from the server. Returns null if not present.
export async function fetchUserData(username: string): Promise<{ users: AppData['users']; sessions: AppData['sessions']; cardioSessions?: AppData['cardioSessions'] } | null> {
  if (!(await checkServer())) return null;
  try {
    const r = await fetch(`/api/data/${encodeURIComponent(username)}`);
    if (!r.ok) return null;
    const j = await r.json();
    return j.data || null;
  } catch {
    return null;
  }
}

// Pushes only the slice of AppData that belongs to `username`.
// This is debounced via the caller.
export async function pushUserData(username: string, appData: AppData): Promise<boolean> {
  if (!(await checkServer())) return false;
  const slice = {
    users: { [username]: appData.users[username] },
    sessions: { [username]: appData.sessions[username] || [] },
    cardioSessions: { [username]: (appData.cardioSessions || {})[username] || [] },
  };
  try {
    const r = await fetch(`/api/data/${encodeURIComponent(username)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: slice }),
    });
    return r.ok;
  } catch {
    return false;
  }
}

// Merge a server slice into the current AppData. Server slice wins for that user.
export function mergeServerData(local: AppData, username: string, remote: any): AppData {
  if (!remote) return local;
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
  return merged;
}
