import type { AppData } from '../types';

export const STORAGE_KEYS = {
  appData: 'gymtracker.v2.appData',
  currentUser: 'gymtracker.v2.currentUser',
  lastSynced: 'gymtracker.v2.lastSynced',
  tokens: 'gymtracker.v2.tokens',
  sessions: 'gymtracker.v2.sessions',
  theme: 'gymtracker.v2.theme',
  language: 'gymtracker.v2.language',
  legacy: {
    appData: 'gymtracker_data',
    currentUser: 'gymtracker_current_user',
    lastSynced: 'gymtracker_last_synced',
    tokens: 'gymtracker_tokens',
    theme: 'gymtracker_theme',
    language: 'gymtracker_language',
  },
} as const;

export function defaultAppData(): AppData {
  return {
    users: {},
    sessions: {},
    cardioSessions: {},
    revision: 0,
  };
}

const LEGACY_TYPE_MAP: Record<string, 'push' | 'pull' | 'legs' | 'upper' | 'lower' | 'full' | 'custom'> = {
  push: 'push',
  pull: 'pull',
  legs: 'legs',
  upper: 'upper',
  lower: 'lower',
  full: 'full',
  custom: 'custom',
};

export function safeLoadJSON<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function safeSetJSON(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (err) {
    console.warn('[storage] quota or serialization error', key, err);
    return false;
  }
}

export function safeRemove(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

export function loadAppData(): AppData {
  const validated = safeLoadJSON<unknown>(STORAGE_KEYS.appData);
  if (validated && isAppData(validated)) {
    return validated;
  }
  const migrated = migrateLegacy();
  if (migrated) return migrated;
  return defaultAppData();
}

function isAppData(value: unknown): value is AppData {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.users === 'object' && v.users !== null &&
    typeof v.sessions === 'object' && v.sessions !== null &&
    typeof v.cardioSessions === 'object' && v.cardioSessions !== null
  );
}

function migrateLegacy(): AppData | null {
  const legacy = safeLoadJSON<any>(STORAGE_KEYS.legacy.appData);
  if (!legacy || typeof legacy !== 'object') return null;
  try {
    const users: AppData['users'] = {};
    const sessions: AppData['sessions'] = {};
    const cardioSessions: AppData['cardioSessions'] = {};
    if (legacy.users && typeof legacy.users === 'object') {
      for (const [key, value] of Object.entries(legacy.users)) {
        const u = value as any;
        const userId = key.toLowerCase();
        users[userId] = {
          userId,
          username: userId,
          createdAt: u.createdAt || new Date().toISOString(),
          weeklyPlan: u.weeklyPlan || { daysPerWeek: 3, days: [] },
          customTemplates: u.customTemplates || [],
          physicalProfile: u.physicalProfile,
          customExercises: u.customExercises || [],
          hiddenExerciseIds: u.hiddenExerciseIds || [],
        };
        if (legacy.sessions && Array.isArray(legacy.sessions[key])) {
          sessions[userId] = legacy.sessions[key].map((s: any) => ({
            ...s,
            type: LEGACY_TYPE_MAP[s.type] || 'custom',
          }));
        } else {
          sessions[userId] = [];
        }
        if (legacy.cardioSessions && Array.isArray(legacy.cardioSessions[key])) {
          cardioSessions[userId] = legacy.cardioSessions[key];
        } else {
          cardioSessions[userId] = [];
        }
      }
    }
    const migrated: AppData = { users, sessions, cardioSessions, revision: 1 };
    safeSetJSON(STORAGE_KEYS.appData, migrated);
    return migrated;
  } catch (err) {
    console.warn('[storage] migration failed', err);
    return null;
  }
}

export function saveAppData(data: AppData): boolean {
  return safeSetJSON(STORAGE_KEYS.appData, data);
}

export function loadLastSynced(): Record<string, { revision: number; updatedAt: number }> {
  return safeLoadJSON<Record<string, { revision: number; updatedAt: number }>>(STORAGE_KEYS.lastSynced) || {};
}

export function saveLastSynced(value: Record<string, { revision: number; updatedAt: number }>): void {
  safeSetJSON(STORAGE_KEYS.lastSynced, value);
}

export function loadTokens(): Record<string, string> {
  return safeLoadJSON<Record<string, string>>(STORAGE_KEYS.tokens) || {};
}

export function saveTokens(value: Record<string, string>): void {
  safeSetJSON(STORAGE_KEYS.tokens, value);
}

export function clearAll(): void {
  for (const key of Object.values(STORAGE_KEYS)) {
    if (typeof key === 'string') safeRemove(key);
  }
  for (const key of Object.values(STORAGE_KEYS.legacy)) {
    safeRemove(key);
  }
}