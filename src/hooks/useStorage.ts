import { useState, useEffect, useCallback, useRef } from 'react';
import type {
  AppData, UserProfile, WorkoutSession, WorkoutTemplate, WeeklyPlan,
  PhysicalProfile, Exercise, CardioSession,
} from '../types';
import { defaultAppData, loadAppData, saveAppData, loadTokens, saveTokens, STORAGE_KEYS } from '../data/repository';
import { DEFAULT_TEMPLATES, EXERCISES } from '../data/exercises';
import { SyncEngine, mergeServerData } from '../lib/syncEngine';
import type { SyncState } from '../lib/sync';
import { authLogin, authRegister } from '../lib/sync';
import { generateId } from '../utils/id';
import { progressiveOverload } from '../utils/suggestions';
import { estimateStrengthCalories, estimateCardioCalories } from '../utils/metrics';

export interface StoredUser {
  userId: string;
  username: string;
  lastSeen: number;
}

export interface UseStorageResult {
  appData: AppData;
  currentUser: string | null;
  currentUserId: string | null;
  login: (username: string, token: string) => Promise<LoginResult>;
  register: (username: string, token: string) => Promise<LoginResult>;
  logout: () => void;
  switchUser: (username: string) => Promise<void>;
  knownUsers: StoredUser[];
  removeKnownUser: (userId: string) => void;
  syncStatus: SyncState;
  syncConflict: { serverRevision: number; serverData: AppData | null } | null;
  resolveConflict: (strategy: 'local' | 'remote' | 'merge') => Promise<void>;
  forceSyncNow: () => Promise<void>;
  getProfile: () => UserProfile | null;
  getSessions: () => WorkoutSession[];
  saveSession: (session: WorkoutSession) => void;
  deleteSession: (sessionId: string) => void;
  duplicateSession: (sessionId: string, newDate?: string) => WorkoutSession | null;
  updateWeeklyPlan: (plan: WeeklyPlan) => void;
  saveTemplate: (template: WorkoutTemplate) => void;
  deleteTemplate: (templateId: string) => void;
  getAllTemplates: () => WorkoutTemplate[];
  getSuggestedSets: (exerciseId: string, numSets: number, defaultReps: number, defaultWeight: number) => { reps: number; weight: number }[];
  updatePhysicalProfile: (profile: PhysicalProfile) => void;
  getPhysicalProfile: () => PhysicalProfile | null;
  getCustomExercises: () => Exercise[];
  getAllExercises: () => Exercise[];
  saveExercise: (exercise: Exercise) => void;
  updateExercise: (exerciseId: string, updates: Partial<Exercise>) => void;
  deleteExercise: (exerciseId: string) => void;
  unhideExercise: (exerciseId: string) => void;
  getHiddenExerciseIds: () => string[];
  getCardioSessions: () => CardioSession[];
  saveCardioSession: (session: CardioSession) => void;
  deleteCardioSession: (sessionId: string) => void;
  estimateWorkoutCalories: (session: WorkoutSession) => number;
  estimateCardioCalories: (cardioTypeId: string, durationMinutes: number, avgHeartRate: number) => number;
  exportUserData: () => void;
  importUserData: (jsonString: string) => ImportResult;
  downloadTemplate: () => void;
  downloadExerciseNames: () => void;
  updateUserPreferences: (prefs: Partial<NonNullable<UserProfile['preferences']>>) => void;
}

export type LoginResult =
  | { ok: true; recoveryCode?: string }
  | { ok: false; error: 'invalid' | 'taken' | 'network' | 'credentials'; message: string };

export type ImportResult =
  | { ok: true; added: { sessions: number; cardio: number; exercises: number; templates: number } }
  | { ok: false; error: 'invalid' | 'empty'; message: string };

const KNOWN_USERS_KEY = 'gymtracker.v2.knownUsers';

function loadKnownUsers(): StoredUser[] {
  try {
    const raw = localStorage.getItem(KNOWN_USERS_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as StoredUser[];
    if (!Array.isArray(arr)) return [];
    return arr.filter((u) => u && typeof u.userId === 'string');
  } catch {
    return [];
  }
}

function saveKnownUsers(users: StoredUser[]): void {
  try {
    localStorage.setItem(KNOWN_USERS_KEY, JSON.stringify(users));
  } catch {
    /* ignore */
  }
}

function normalizeUsernameKey(s: string): string {
  return s.trim().toLowerCase().normalize('NFKC');
}

export function useStorage(): UseStorageResult {
  const [appData, setAppData] = useState<AppData>(() => loadAppData());
  const [currentUser, setCurrentUser] = useState<string | null>(() => {
    try {
      return localStorage.getItem(STORAGE_KEYS.currentUser);
    } catch {
      return null;
    }
  });
  const [knownUsers, setKnownUsers] = useState<StoredUser[]>(() => loadKnownUsers());
  const [syncStatus, setSyncStatus] = useState<SyncState>({ kind: 'idle' });
  const [syncConflict, setSyncConflict] = useState<{ serverRevision: number; serverData: AppData | null } | null>(null);

  const tokensRef = useRef<Record<string, string>>(loadTokens());
  const engineRef = useRef<SyncEngine | null>(null);
  const appDataRef = useRef(appData);
  appDataRef.current = appData;
  const currentUserRef = useRef(currentUser);
  currentUserRef.current = currentUser;

  const persist = useCallback((next: AppData) => {
    setAppData(next);
    saveAppData(next);
  }, []);

  const persistUser = useCallback((mutator: (data: AppData, username: string) => AppData) => {
    setAppData((prev) => {
      const username = currentUserRef.current;
      if (!username) return prev;
      const next = mutator(prev, username);
      saveAppData(next);
      return next;
    });
  }, []);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(STORAGE_KEYS.currentUser, currentUser);
    } else {
      localStorage.removeItem(STORAGE_KEYS.currentUser);
    }
  }, [currentUser]);

  const rememberUser = useCallback((username: string) => {
    const normalized = normalizeUsernameKey(username);
    setKnownUsers((prev) => {
      const existing = prev.filter((u) => u.userId !== normalized);
      const updated = [{ userId: normalized, username, lastSeen: Date.now() }, ...existing].slice(0, 20);
      saveKnownUsers(updated);
      return updated;
    });
  }, []);

  const getToken = useCallback(() => {
    const username = currentUserRef.current;
    if (!username) return null;
    return tokensRef.current[username] || null;
  }, []);

  const setToken = useCallback((username: string, token: string) => {
    const normalized = normalizeUsernameKey(username);
    tokensRef.current = { ...tokensRef.current, [normalized]: token };
    saveTokens(tokensRef.current);
  }, []);

  const startEngine = useCallback((username: string) => {
    if (engineRef.current) engineRef.current.stop();
    const engine = new SyncEngine({
      username: normalizeUsernameKey(username),
      getToken,
      getCurrentData: () => appDataRef.current,
      onState: setSyncStatus,
      onRemotePulled: (remote, _revision) => {
        setAppData((prev) => mergeServerData(prev, normalizeUsernameKey(username), remote));
      },
      onConflict: (serverRevision, serverData) => {
        setSyncConflict({ serverRevision, serverData });
      },
      onUnauthorized: () => {
        delete tokensRef.current[normalizeUsernameKey(username)];
        saveTokens(tokensRef.current);
      },
    });
    engineRef.current = engine;
    void engine.start();
  }, [getToken]);

  const stopEngine = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.stop();
      engineRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => stopEngine();
  }, [stopEngine]);

  const performLogin = useCallback(async (
    username: string,
    token: string,
    mode: 'login' | 'register',
  ): Promise<LoginResult> => {
    const normalized = normalizeUsernameKey(username);
    if (normalized.length < 2 || normalized.length > 32) {
      return { ok: false, error: 'invalid', message: 'Username must be 2-32 characters' };
    }
    if (token.length < 8) {
      return { ok: false, error: 'credentials', message: 'Password must be at least 8 characters' };
    }
    setToken(normalized, token);
    setSyncStatus({ kind: 'pulling' });

    let result;
    if (mode === 'register') {
      const initial: AppData = {
        ...defaultAppData(),
        users: { [normalized]: createInitialProfile(normalized) },
        sessions: { [normalized]: [] },
        cardioSessions: { [normalized]: [] },
        revision: 1,
      };
      result = await authRegister(normalized, token, initial);
    } else {
      result = await authLogin(normalized, token);
    }

    if (!result.ok) {
      if (result.kind === 'conflict') {
        return { ok: false, error: 'taken', message: 'Username already taken' };
      }
      if (result.kind === 'unauthorized') {
        return { ok: false, error: 'credentials', message: 'Invalid credentials' };
      }
      if (result.kind === 'offline') {
        return { ok: false, error: 'network', message: result.message };
      }
      return { ok: false, error: 'network', message: result.message };
    }

    setAppData((prev) => {
      const next: AppData = {
        ...prev,
        users: { ...prev.users, [normalized]: prev.users[normalized] || createInitialProfile(normalized) },
        sessions: { ...prev.sessions, [normalized]: prev.sessions[normalized] || [] },
        cardioSessions: { ...(prev.cardioSessions || {}), [normalized]: prev.cardioSessions?.[normalized] || [] },
      };
      saveAppData(next);
      return next;
    });
    setCurrentUser(normalized);
    rememberUser(normalized);
    startEngine(normalized);

    const recoveryCode = mode === 'register' && 'recoveryCode' in result.data
      ? result.data.recoveryCode
      : undefined;
    return { ok: true, recoveryCode };
  }, [rememberUser, setToken, startEngine]);

  const login = useCallback(
    (username: string, token: string) => performLogin(username, token, 'login'),
    [performLogin],
  );

  const register = useCallback(
    (username: string, token: string) => performLogin(username, token, 'register'),
    [performLogin],
  );

  const logout = useCallback(() => {
    stopEngine();
    setCurrentUser(null);
    setSyncStatus({ kind: 'idle' });
    setSyncConflict(null);
  }, [stopEngine]);

  const switchUser = useCallback(async (username: string) => {
    setCurrentUser(username);
    setSyncStatus({ kind: 'pulling' });
    setSyncConflict(null);
    startEngine(username);
  }, [startEngine]);

  const removeKnownUser = useCallback((userId: string) => {
    setKnownUsers((prev) => {
      const next = prev.filter((u) => u.userId !== userId);
      saveKnownUsers(next);
      return next;
    });
    if (tokensRef.current[userId]) {
      const { [userId]: _, ...rest } = tokensRef.current;
      tokensRef.current = rest;
      saveTokens(tokensRef.current);
    }
  }, []);

  const getProfile = useCallback((): UserProfile | null => {
    if (!currentUser) return null;
    return appData.users[currentUser] || null;
  }, [appData, currentUser]);

  const getSessions = useCallback((): WorkoutSession[] => {
    if (!currentUser) return [];
    return appData.sessions[currentUser] || [];
  }, [appData, currentUser]);

  const markDirty = useCallback(() => {
    engineRef.current?.markDirty();
  }, []);

  const saveSession = useCallback((session: WorkoutSession) => {
    persistUser((prev, username) => {
      const list = prev.sessions[username] || [];
      const idx = list.findIndex((s) => s.id === session.id);
      const updated = idx >= 0
        ? list.map((s) => (s.id === session.id ? session : s))
        : [...list, session];
      return { ...prev, sessions: { ...prev.sessions, [username]: updated } };
    });
    markDirty();
  }, [markDirty, persistUser]);

  const deleteSession = useCallback((sessionId: string) => {
    persistUser((prev, username) => ({
      ...prev,
      sessions: {
        ...prev.sessions,
        [username]: (prev.sessions[username] || []).filter((s) => s.id !== sessionId),
      },
    }));
    markDirty();
  }, [markDirty, persistUser]);

  const duplicateSession = useCallback((sessionId: string, newDate?: string): WorkoutSession | null => {
    if (!currentUser) return null;
    const sessions = appData.sessions[currentUser] || [];
    const original = sessions.find((s) => s.id === sessionId);
    if (!original) return null;
    const date = newDate || new Date().toISOString();
    const copy: WorkoutSession = {
      ...original,
      id: generateId('workout'),
      date,
      completed: false,
      durationMinutes: undefined,
      caloriesBurned: undefined,
      exercises: original.exercises.map((ex) => ({
        ...ex,
        id: generateId('exlog'),
        sets: ex.sets.map((s) => ({ ...s, id: generateId('set'), completed: false })),
      })),
    };
    saveSession(copy);
    return copy;
  }, [appData, currentUser, saveSession]);

  const updateWeeklyPlan = useCallback((plan: WeeklyPlan) => {
    persistUser((prev, username) => {
      const user = prev.users[username];
      if (!user) return prev;
      return {
        ...prev,
        users: { ...prev.users, [username]: { ...user, weeklyPlan: plan } },
      };
    });
    markDirty();
  }, [markDirty, persistUser]);

  const saveTemplate = useCallback((template: WorkoutTemplate) => {
    persistUser((prev, username) => {
      const user = prev.users[username];
      if (!user) return prev;
      const list = user.customTemplates || [];
      const idx = list.findIndex((t) => t.id === template.id);
      const updated = idx >= 0
        ? list.map((t) => (t.id === template.id ? template : t))
        : [...list, template];
      return {
        ...prev,
        users: { ...prev.users, [username]: { ...user, customTemplates: updated } },
      };
    });
    markDirty();
  }, [markDirty, persistUser]);

  const deleteTemplate = useCallback((templateId: string) => {
    persistUser((prev, username) => {
      const user = prev.users[username];
      if (!user) return prev;
      return {
        ...prev,
        users: {
          ...prev.users,
          [username]: {
            ...user,
            customTemplates: (user.customTemplates || []).filter((t) => t.id !== templateId),
            weeklyPlan: {
              ...user.weeklyPlan,
              days: user.weeklyPlan.days.map((d) =>
                d.templateId === templateId ? { ...d, templateId: null } : d,
              ),
            },
          },
        },
      };
    });
    markDirty();
  }, [markDirty, persistUser]);

  const getAllTemplates = useCallback((): WorkoutTemplate[] => {
    const custom = getProfile()?.customTemplates || [];
    const customIds = new Set(custom.map((t) => t.id));
    return [...DEFAULT_TEMPLATES, ...custom.filter((t) => !DEFAULT_TEMPLATES.some((d) => d.id === t.id) || customIds.has(t.id))];
  }, [getProfile]);

  const getSuggestedSets = useCallback((
    exerciseId: string,
    numSets: number,
    defaultReps: number,
    defaultWeight: number,
  ) => {
    const sessions = getSessions();
    return progressiveOverload(sessions, exerciseId, numSets, defaultReps, defaultWeight);
  }, [getSessions]);

  const updatePhysicalProfile = useCallback((profile: PhysicalProfile) => {
    persistUser((prev, username) => {
      const user = prev.users[username];
      if (!user) return prev;
      return {
        ...prev,
        users: { ...prev.users, [username]: { ...user, physicalProfile: profile } },
      };
    });
    markDirty();
  }, [markDirty, persistUser]);

  const getPhysicalProfile = useCallback((): PhysicalProfile | null => {
    return getProfile()?.physicalProfile || null;
  }, [getProfile]);

  const getCustomExercises = useCallback((): Exercise[] => {
    return getProfile()?.customExercises || [];
  }, [getProfile]);

  const getAllExercises = useCallback((): Exercise[] => {
    const custom = getCustomExercises();
    const merged = [...EXERCISES];
    custom.forEach((c) => {
      const idx = merged.findIndex((e) => e.id === c.id);
      if (idx >= 0) merged[idx] = c;
      else merged.push(c);
    });
    return merged;
  }, [getCustomExercises]);

  const saveExercise = useCallback((exercise: Exercise) => {
    persistUser((prev, username) => {
      const user = prev.users[username];
      if (!user) return prev;
      const list = user.customExercises || [];
      const idx = list.findIndex((e) => e.id === exercise.id);
      const updated = idx >= 0
        ? list.map((e) => (e.id === exercise.id ? exercise : e))
        : [...list, { ...exercise, isCustom: true }];
      return {
        ...prev,
        users: { ...prev.users, [username]: { ...user, customExercises: updated } },
      };
    });
    markDirty();
  }, [markDirty, persistUser]);

  const updateExercise = useCallback((exerciseId: string, updates: Partial<Exercise>) => {
    persistUser((prev, username) => {
      const user = prev.users[username];
      if (!user) return prev;
      const list = user.customExercises || [];
      const idx = list.findIndex((e) => e.id === exerciseId);
      if (idx >= 0) {
        const updated = list.map((e) => (e.id === exerciseId ? { ...e, ...updates } : e));
        return {
          ...prev,
          users: { ...prev.users, [username]: { ...user, customExercises: updated } },
        };
      }
      const defaults = EXERCISES.find((e) => e.id === exerciseId);
      if (defaults) {
        const modified: Exercise = { ...defaults, ...updates, id: exerciseId, isCustom: true };
        return {
          ...prev,
          users: {
            ...prev.users,
            [username]: { ...user, customExercises: [...list, modified] },
          },
        };
      }
      return prev;
    });
    markDirty();
  }, [markDirty, persistUser]);

  const deleteExercise = useCallback((exerciseId: string) => {
    persistUser((prev, username) => {
      const user = prev.users[username];
      if (!user) return prev;
      const list = user.customExercises || [];
      const isCustom = list.some((e) => e.id === exerciseId);
      if (isCustom) {
        return {
          ...prev,
          users: {
            ...prev.users,
            [username]: {
              ...user,
              customExercises: list.filter((e) => e.id !== exerciseId),
            },
          },
        };
      }
      const hidden = user.hiddenExerciseIds || [];
      if (hidden.includes(exerciseId)) return prev;
      return {
        ...prev,
        users: {
          ...prev.users,
          [username]: {
            ...user,
            hiddenExerciseIds: [...hidden, exerciseId],
          },
        },
      };
    });
    markDirty();
  }, [markDirty, persistUser]);

  const unhideExercise = useCallback((exerciseId: string) => {
    persistUser((prev, username) => {
      const user = prev.users[username];
      if (!user) return prev;
      return {
        ...prev,
        users: {
          ...prev.users,
          [username]: {
            ...user,
            hiddenExerciseIds: (user.hiddenExerciseIds || []).filter((id) => id !== exerciseId),
          },
        },
      };
    });
    markDirty();
  }, [markDirty, persistUser]);

  const getHiddenExerciseIds = useCallback((): string[] => {
    return getProfile()?.hiddenExerciseIds || [];
  }, [getProfile]);

  const getCardioSessions = useCallback((): CardioSession[] => {
    if (!currentUser) return [];
    return appData.cardioSessions?.[currentUser] || [];
  }, [appData, currentUser]);

  const saveCardioSession = useCallback((session: CardioSession) => {
    persistUser((prev, username) => {
      const list = prev.cardioSessions?.[username] || [];
      const idx = list.findIndex((s) => s.id === session.id);
      const updated = idx >= 0
        ? list.map((s) => (s.id === session.id ? session : s))
        : [...list, session];
      return {
        ...prev,
        cardioSessions: { ...(prev.cardioSessions || {}), [username]: updated },
      };
    });
    markDirty();
  }, [markDirty, persistUser]);

  const deleteCardioSession = useCallback((sessionId: string) => {
    persistUser((prev, username) => {
      const list = prev.cardioSessions?.[username] || [];
      return {
        ...prev,
        cardioSessions: {
          ...(prev.cardioSessions || {}),
          [username]: list.filter((s) => s.id !== sessionId),
        },
      };
    });
    markDirty();
  }, [markDirty, persistUser]);

  const estimateWorkoutCalories = useCallback((session: WorkoutSession) => {
    return estimateStrengthCalories(session, getPhysicalProfile());
  }, [getPhysicalProfile]);

  const estimateCardioCaloriesCb = useCallback(
    (cardioTypeId: string, durationMinutes: number, avgHeartRate: number) => {
      return estimateCardioCalories(cardioTypeId, durationMinutes, avgHeartRate, getPhysicalProfile());
    },
    [getPhysicalProfile],
  );

  const exportUserData = useCallback(() => {
    if (!currentUser) return;
    const profile = getProfile();
    const sessions = getSessions();
    const cardioSessionsData = getCardioSessions();
    const customExercisesData = getCustomExercises();
    const exportData = {
      version: 1,
      exportDate: new Date().toISOString(),
      username: currentUser,
      profile,
      sessions,
      cardioSessions: cardioSessionsData,
      customExercises: customExercisesData,
      customTemplates: profile?.customTemplates || [],
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gymtracker-${currentUser}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [currentUser, getCardioSessions, getCustomExercises, getProfile, getSessions]);

  const importUserData = useCallback((jsonString: string): ImportResult => {
    if (!currentUser) return { ok: false, error: 'invalid', message: 'No active user' };
    try {
      const parsed = JSON.parse(jsonString);
      if (typeof parsed !== 'object' || parsed === null) {
        return { ok: false, error: 'invalid', message: 'Invalid JSON' };
      }
      if (parsed.version !== 1) {
        return { ok: false, error: 'invalid', message: 'Unsupported version' };
      }
      const incomingSessions = Array.isArray(parsed.sessions) ? parsed.sessions : [];
      const incomingCardio = Array.isArray(parsed.cardioSessions) ? parsed.cardioSessions : [];
      const incomingExercises = Array.isArray(parsed.customExercises) ? parsed.customExercises : [];
      const incomingTemplates = Array.isArray(parsed.customTemplates) ? parsed.customTemplates : [];

      const existingSessions = appData.sessions[currentUser] || [];
      const existingCardio = appData.cardioSessions?.[currentUser] || [];
      const profile = appData.users[currentUser];
      const existingExercises = profile?.customExercises || [];
      const existingTemplates = profile?.customTemplates || [];

      const sessionIds = new Set(existingSessions.map((s) => s.id));
      const cardioIds = new Set(existingCardio.map((s) => s.id));
      const exerciseIds = new Set(existingExercises.map((e) => e.id));
      const templateIds = new Set(existingTemplates.map((t) => t.id));

      const newSessions = incomingSessions.filter((s: WorkoutSession) => s?.id && !sessionIds.has(s.id));
      const newCardio = incomingCardio.filter((s: CardioSession) => s?.id && !cardioIds.has(s.id));
      const newExercises = incomingExercises.filter((e: Exercise) => e?.id && !exerciseIds.has(e.id));
      const newTemplates = incomingTemplates.filter((t: WorkoutTemplate) => t?.id && !templateIds.has(t.id));

      const user = profile;
      const updated: AppData = {
        ...appData,
        sessions: {
          ...appData.sessions,
          [currentUser]: [...existingSessions, ...newSessions],
        },
        cardioSessions: {
          ...(appData.cardioSessions || {}),
          [currentUser]: [...existingCardio, ...newCardio],
        },
        users: user ? {
          ...appData.users,
          [currentUser]: {
            ...user,
            customExercises: [...existingExercises, ...newExercises],
            customTemplates: [...existingTemplates, ...newTemplates],
            physicalProfile: user.physicalProfile || parsed.profile?.physicalProfile,
          },
        } : appData.users,
      };
      persist(updated);
      markDirty();
      return {
        ok: true,
        added: {
          sessions: newSessions.length,
          cardio: newCardio.length,
          exercises: newExercises.length,
          templates: newTemplates.length,
        },
      };
    } catch (err) {
      return { ok: false, error: 'invalid', message: err instanceof Error ? err.message : 'Parse error' };
    }
  }, [appData, currentUser, markDirty, persist]);

  const downloadTemplate = useCallback(() => {
    const csv = `date,type,exercise_name,sets,reps,weight,notes
2025-01-15,Push,Bench Press,4,8,85,"Buen entrenamiento"
2025-01-17,Pull,Deadlift,4,6,120,""`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'gymtracker-template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  const downloadExerciseNames = useCallback(() => {
    const allEx = getAllExercises();
    const csv = 'exercise_name\n' + allEx.map((ex) => ex.name).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'gymtracker-exercises.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [getAllExercises]);

  const updateUserPreferences = useCallback((prefs: Partial<NonNullable<UserProfile['preferences']>>) => {
    persistUser((prev, username) => {
      const user = prev.users[username];
      if (!user) return prev;
      return {
        ...prev,
        users: {
          ...prev.users,
          [username]: { ...user, preferences: { ...user.preferences, ...prefs } },
        },
      };
    });
    markDirty();
  }, [markDirty, persistUser]);

  const resolveConflict = useCallback(async (strategy: 'local' | 'remote' | 'merge') => {
    if (!syncConflict || !currentUser) return;
    const engine = engineRef.current;
    if (!engine) return;
    if (strategy === 'remote' && syncConflict.serverData) {
      setAppData((prev) => mergeServerData(prev, currentUser, syncConflict.serverData!));
      setSyncConflict(null);
      await engine.refreshFromNetwork();
      return;
    }
    if (strategy === 'merge' && syncConflict.serverData) {
      setAppData((prev) => mergeServerData(prev, currentUser, syncConflict.serverData!));
    }
    setSyncConflict(null);
    engine.markDirty();
  }, [currentUser, syncConflict]);

  const forceSyncNow = useCallback(async () => {
    await engineRef.current?.refreshFromNetwork();
  }, []);

  return {
    appData,
    currentUser,
    currentUserId: currentUser,
    login,
    register,
    logout,
    switchUser,
    knownUsers,
    removeKnownUser,
    syncStatus,
    syncConflict,
    resolveConflict,
    forceSyncNow,
    getProfile,
    getSessions,
    saveSession,
    deleteSession,
    duplicateSession,
    updateWeeklyPlan,
    saveTemplate,
    deleteTemplate,
    getAllTemplates,
    getSuggestedSets,
    updatePhysicalProfile,
    getPhysicalProfile,
    getCustomExercises,
    getAllExercises,
    saveExercise,
    updateExercise,
    deleteExercise,
    unhideExercise,
    getHiddenExerciseIds,
    getCardioSessions,
    saveCardioSession,
    deleteCardioSession,
    estimateWorkoutCalories,
    estimateCardioCalories: estimateCardioCaloriesCb,
    exportUserData,
    importUserData,
    downloadTemplate,
    downloadExerciseNames,
    updateUserPreferences,
  };
}

function createInitialProfile(username: string): UserProfile {
  return {
    userId: normalizeUsernameKey(username),
    username,
    createdAt: new Date().toISOString(),
    weeklyPlan: { daysPerWeek: 3, days: [] },
    customTemplates: [],
    customExercises: [],
    hiddenExerciseIds: [],
    preferences: {},
  };
}