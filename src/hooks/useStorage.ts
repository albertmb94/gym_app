import { useState, useEffect, useCallback } from 'react';
import { AppData, UserProfile, WorkoutSession, WorkoutTemplate, WeeklyPlan, UserDetails, CardioSession, Exercise } from '../types';
import { DEFAULT_TEMPLATES, EXERCISES } from '../data/exercises';

const STORAGE_KEY = 'gymtracker_data';

const defaultAppData: AppData = {
  users: {},
  sessions: {},
  cardioSessions: {},
};

function loadData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultAppData;
    const parsed = JSON.parse(raw);
    return {
      ...defaultAppData,
      ...parsed,
      cardioSessions: parsed.cardioSessions || {},
    };
  } catch {
    return defaultAppData;
  }
}

function saveData(data: AppData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function useStorage() {
  const [appData, setAppData] = useState<AppData>(loadData);
  const [currentUser, setCurrentUser] = useState<string | null>(() => {
    return localStorage.getItem('gymtracker_current_user');
  });

  useEffect(() => {
    saveData(appData);
  }, [appData]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('gymtracker_current_user', currentUser);
    } else {
      localStorage.removeItem('gymtracker_current_user');
    }
  }, [currentUser]);

  const login = useCallback((username: string) => {
    const trimmed = username.trim();
    if (!trimmed) return false;
    setAppData(prev => {
      if (!prev.users[trimmed]) {
        const newUser: UserProfile = {
          username: trimmed,
          createdAt: new Date().toISOString(),
          weeklyPlan: {
            daysPerWeek: 3,
            days: [],
          },
          customTemplates: [],
          customExercises: [],
        };
        const updated = {
          ...prev,
          users: { ...prev.users, [trimmed]: newUser },
          sessions: { ...prev.sessions, [trimmed]: [] },
          cardioSessions: { ...prev.cardioSessions, [trimmed]: [] },
        };
        saveData(updated);
        return updated;
      }
      return prev;
    });
    setCurrentUser(trimmed);
    return true;
  }, []);

  const logout = useCallback(() => {
    setCurrentUser(null);
  }, []);

  const getProfile = useCallback((): UserProfile | null => {
    if (!currentUser) return null;
    return appData.users[currentUser] || null;
  }, [appData, currentUser]);

  const updateProfileDetails = useCallback((details: UserDetails) => {
    if (!currentUser) return;
    setAppData(prev => {
      const user = prev.users[currentUser];
      if (!user) return prev;
      return {
        ...prev,
        users: { ...prev.users, [currentUser]: { ...user, details } },
      };
    });
  }, [currentUser]);

  const getSessions = useCallback((): WorkoutSession[] => {
    if (!currentUser) return [];
    return appData.sessions[currentUser] || [];
  }, [appData, currentUser]);

  const saveSession = useCallback((session: WorkoutSession) => {
    if (!currentUser) return;
    setAppData(prev => {
      const userSessions = prev.sessions[currentUser] || [];
      const idx = userSessions.findIndex(s => s.id === session.id);
      const updated = idx >= 0
        ? userSessions.map(s => s.id === session.id ? session : s)
        : [...userSessions, session];
      return {
        ...prev,
        sessions: { ...prev.sessions, [currentUser]: updated },
      };
    });
  }, [currentUser]);

  const deleteSession = useCallback((sessionId: string) => {
    if (!currentUser) return;
    setAppData(prev => {
      const userSessions = prev.sessions[currentUser] || [];
      return {
        ...prev,
        sessions: { ...prev.sessions, [currentUser]: userSessions.filter(s => s.id !== sessionId) },
      };
    });
  }, [currentUser]);

  const getCardioSessions = useCallback((): CardioSession[] => {
    if (!currentUser) return [];
    return appData.cardioSessions[currentUser] || [];
  }, [appData, currentUser]);

  const saveCardioSession = useCallback((cardio: CardioSession) => {
    if (!currentUser) return;
    setAppData(prev => {
      const existing = prev.cardioSessions[currentUser] || [];
      const idx = existing.findIndex(c => c.id === cardio.id);
      const updated = idx >= 0
        ? existing.map(c => c.id === cardio.id ? cardio : c)
        : [...existing, cardio];
      return {
        ...prev,
        cardioSessions: { ...prev.cardioSessions, [currentUser]: updated },
      };
    });
  }, [currentUser]);

  const deleteCardioSession = useCallback((id: string) => {
    if (!currentUser) return;
    setAppData(prev => {
      const existing = prev.cardioSessions[currentUser] || [];
      return {
        ...prev,
        cardioSessions: { ...prev.cardioSessions, [currentUser]: existing.filter(c => c.id !== id) },
      };
    });
  }, [currentUser]);

  const updateWeeklyPlan = useCallback((plan: WeeklyPlan) => {
    if (!currentUser) return;
    setAppData(prev => {
      const user = prev.users[currentUser];
      if (!user) return prev;
      return {
        ...prev,
        users: { ...prev.users, [currentUser]: { ...user, weeklyPlan: plan } },
      };
    });
  }, [currentUser]);

  const saveTemplate = useCallback((template: WorkoutTemplate) => {
    if (!currentUser) return;
    setAppData(prev => {
      const user = prev.users[currentUser];
      if (!user) return prev;
      const existing = user.customTemplates || [];
      const idx = existing.findIndex(t => t.id === template.id);
      const updated = idx >= 0
        ? existing.map(t => t.id === template.id ? template : t)
        : [...existing, template];
      return {
        ...prev,
        users: { ...prev.users, [currentUser]: { ...user, customTemplates: updated } },
      };
    });
  }, [currentUser]);

  const deleteTemplate = useCallback((templateId: string) => {
    if (!currentUser) return;
    setAppData(prev => {
      const user = prev.users[currentUser];
      if (!user) return prev;
      return {
        ...prev,
        users: { ...prev.users, [currentUser]: { ...user, customTemplates: user.customTemplates.filter(t => t.id !== templateId) } },
      };
    });
  }, [currentUser]);

  const getAllExercises = useCallback((): Exercise[] => {
    const profile = getProfile();
    const custom = profile?.customExercises || [];
    // Combine base with custom, overriding by ID if duplicate
    const baseMap = new Map<string, Exercise>();
    EXERCISES.forEach(e => baseMap.set(e.id, e));
    custom.forEach(e => baseMap.set(e.id, e));
    return Array.from(baseMap.values());
  }, [getProfile]);

  const saveExercise = useCallback((exercise: Exercise) => {
    if (!currentUser) return;
    setAppData(prev => {
      const user = prev.users[currentUser];
      if (!user) return prev;
      const existing = user.customExercises || [];
      const idx = existing.findIndex(e => e.id === exercise.id);
      const updated = idx >= 0
        ? existing.map(e => e.id === exercise.id ? exercise : e)
        : [...existing, { ...exercise, isCustom: true }];
      return {
        ...prev,
        users: { ...prev.users, [currentUser]: { ...user, customExercises: updated } },
      };
    });
  }, [currentUser]);

  const getAllTemplates = useCallback((): WorkoutTemplate[] => {
    const profile = getProfile();
    const custom = profile?.customTemplates || [];
    return [...DEFAULT_TEMPLATES, ...custom];
  }, [getProfile]);

  const getSuggestedSets = useCallback((exerciseId: string, numSets: number, defaultReps: number, defaultWeight: number) => {
    const sessions = getSessions();
    const relevantSessions = sessions
      .filter(s => s.completed && s.exercises.some(e => e.exerciseId === exerciseId))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 3);

    if (relevantSessions.length === 0) {
      return Array.from({ length: numSets }, () => ({ reps: defaultReps, weight: defaultWeight }));
    }

    const lastSession = relevantSessions[0];
    const lastExercise = lastSession.exercises.find(e => e.exerciseId === exerciseId);
    if (!lastExercise || lastExercise.sets.length === 0) {
      return Array.from({ length: numSets }, () => ({ reps: defaultReps, weight: defaultWeight }));
    }

    const completedSets = lastExercise.sets.filter(s => s.completed);
    if (completedSets.length === 0) {
      return Array.from({ length: numSets }, () => ({ reps: defaultReps, weight: defaultWeight }));
    }

    const allCompleted = lastExercise.sets.every(s => s.completed);
    const avgWeight = completedSets.reduce((sum, s) => sum + s.weight, 0) / completedSets.length;
    const avgReps = completedSets.reduce((sum, s) => sum + s.reps, 0) / completedSets.length;

    const suggestedWeight = allCompleted ? Math.round((avgWeight + 2.5) * 2) / 2 : avgWeight;
    const suggestedReps = Math.round(avgReps);

    return Array.from({ length: numSets }, (_, i) => {
      if (i < completedSets.length) {
        return { reps: completedSets[i].reps, weight: allCompleted ? suggestedWeight : completedSets[i].weight };
      }
      return { reps: suggestedReps, weight: suggestedWeight };
    });
  }, [getSessions]);

  return {
    currentUser,
    login,
    logout,
    getProfile,
    getSessions,
    saveSession,
    deleteSession,
    updateWeeklyPlan,
    saveTemplate,
    deleteTemplate,
    getAllTemplates,
    getSuggestedSets,
    updateProfileDetails,
    getCardioSessions,
    saveCardioSession,
    deleteCardioSession,
    getAllExercises,
    saveExercise,
  };
}
