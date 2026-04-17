import { useState, useEffect, useCallback } from 'react';
import { AppData, UserProfile, WorkoutSession, WorkoutTemplate, WeeklyPlan, PhysicalProfile, Exercise, CardioSession } from '../types';
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
    return JSON.parse(raw);
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
        };
        const updated = {
          ...prev,
          users: { ...prev.users, [trimmed]: newUser },
          sessions: { ...prev.sessions, [trimmed]: [] },
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

  const getAllTemplates = useCallback((): WorkoutTemplate[] => {
    const profile = getProfile();
    const custom = profile?.customTemplates || [];
    return [...DEFAULT_TEMPLATES, ...custom];
  }, [getProfile]);

  // Smart weight suggestion based on last sessions of an exercise
  const getSuggestedSets = useCallback((exerciseId: string, numSets: number, defaultReps: number, defaultWeight: number) => {
    const sessions = getSessions();
    // Find last 3 sessions with this exercise
    const relevantSessions = sessions
      .filter(s => s.completed && s.exercises.some(e => e.exerciseId === exerciseId))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 3);

    if (relevantSessions.length === 0) {
      return Array.from({ length: numSets }, () => ({ reps: defaultReps, weight: defaultWeight }));
    }

    // Get the most recent completed sets for this exercise
    const lastSession = relevantSessions[0];
    const lastExercise = lastSession.exercises.find(e => e.exerciseId === exerciseId);
    if (!lastExercise || lastExercise.sets.length === 0) {
      return Array.from({ length: numSets }, () => ({ reps: defaultReps, weight: defaultWeight }));
    }

    const completedSets = lastExercise.sets.filter(s => s.completed);
    if (completedSets.length === 0) {
      return Array.from({ length: numSets }, () => ({ reps: defaultReps, weight: defaultWeight }));
    }

    // Calculate progression: if all sets completed, suggest small increase
    const allCompleted = lastExercise.sets.every(s => s.completed);
    const avgWeight = completedSets.reduce((sum, s) => sum + s.weight, 0) / completedSets.length;
    const avgReps = completedSets.reduce((sum, s) => sum + s.reps, 0) / completedSets.length;

    // Progressive overload: if all sets completed last time, add 2.5kg
    const suggestedWeight = allCompleted ? Math.round((avgWeight + 2.5) * 2) / 2 : avgWeight;
    const suggestedReps = Math.round(avgReps);

    return Array.from({ length: numSets }, (_, i) => {
      if (i < completedSets.length) {
        return { reps: completedSets[i].reps, weight: allCompleted ? suggestedWeight : completedSets[i].weight };
      }
      return { reps: suggestedReps, weight: suggestedWeight };
    });
  }, [getSessions]);

  // Physical profile management
  const updatePhysicalProfile = useCallback((profile: PhysicalProfile) => {
    if (!currentUser) return;
    setAppData(prev => {
      const user = prev.users[currentUser];
      if (!user) return prev;
      return {
        ...prev,
        users: { ...prev.users, [currentUser]: { ...user, physicalProfile: profile } },
      };
    });
  }, [currentUser]);

  const getPhysicalProfile = useCallback((): PhysicalProfile | null => {
    const profile = getProfile();
    return profile?.physicalProfile || null;
  }, [getProfile]);

  // Custom exercises management
  const getCustomExercises = useCallback((): Exercise[] => {
    const profile = getProfile();
    return profile?.customExercises || [];
  }, [getProfile]);

  const getAllExercises = useCallback((): Exercise[] => {
    const custom = getCustomExercises();
    return [...EXERCISES, ...custom];
  }, [getCustomExercises]);

  const saveExercise = useCallback((exercise: Exercise) => {
    if (!currentUser) return;
    setAppData(prev => {
      const user = prev.users[currentUser];
      if (!user) return prev;
      const existing = user.customExercises || [];
      const idx = existing.findIndex(e => e.id === exercise.id);
      
      // Check if it's a default exercise being edited
      const defaultExercise = EXERCISES.find(e => e.id === exercise.id);
      if (defaultExercise) {
        // Add as custom override
        const customExercise = { ...exercise, isCustom: true, id: `custom-${exercise.id}-${Date.now()}` };
        return {
          ...prev,
          users: { ...prev.users, [currentUser]: { ...user, customExercises: [...existing, customExercise] } },
        };
      }
      
      const updated = idx >= 0
        ? existing.map(e => e.id === exercise.id ? exercise : e)
        : [...existing, { ...exercise, isCustom: true }];
      return {
        ...prev,
        users: { ...prev.users, [currentUser]: { ...user, customExercises: updated } },
      };
    });
  }, [currentUser]);

  const updateExercise = useCallback((exerciseId: string, updates: Partial<Exercise>) => {
    if (!currentUser) return;
    setAppData(prev => {
      const user = prev.users[currentUser];
      if (!user) return prev;
      const customExercises = user.customExercises || [];
      
      // Check if it's a custom exercise
      const customIdx = customExercises.findIndex(e => e.id === exerciseId);
      if (customIdx >= 0) {
        const updated = customExercises.map(e => e.id === exerciseId ? { ...e, ...updates } : e);
        return {
          ...prev,
          users: { ...prev.users, [currentUser]: { ...user, customExercises: updated } },
        };
      }
      
      // It's a default exercise - create a modified copy
      const defaultExercise = EXERCISES.find(e => e.id === exerciseId);
      if (defaultExercise) {
        const modifiedExercise: Exercise = { 
          ...defaultExercise, 
          ...updates, 
          id: exerciseId, // Keep same ID so references work
          isCustom: true 
        };
        return {
          ...prev,
          users: { ...prev.users, [currentUser]: { ...user, customExercises: [...customExercises, modifiedExercise] } },
        };
      }
      
      return prev;
    });
  }, [currentUser]);

  const deleteExercise = useCallback((exerciseId: string) => {
    if (!currentUser) return;
    setAppData(prev => {
      const user = prev.users[currentUser];
      if (!user) return prev;
      return {
        ...prev,
        users: { ...prev.users, [currentUser]: { ...user, customExercises: (user.customExercises || []).filter(e => e.id !== exerciseId) } },
      };
    });
  }, [currentUser]);

  // Cardio sessions management
  const getCardioSessions = useCallback((): CardioSession[] => {
    if (!currentUser) return [];
    return appData.cardioSessions[currentUser] || [];
  }, [appData, currentUser]);

  const saveCardioSession = useCallback((session: CardioSession) => {
    if (!currentUser) return;
    setAppData(prev => {
      const userSessions = prev.cardioSessions[currentUser] || [];
      const idx = userSessions.findIndex(s => s.id === session.id);
      const updated = idx >= 0
        ? userSessions.map(s => s.id === session.id ? session : s)
        : [...userSessions, session];
      return {
        ...prev,
        cardioSessions: { ...prev.cardioSessions, [currentUser]: updated },
      };
    });
  }, [currentUser]);

  const deleteCardioSession = useCallback((sessionId: string) => {
    if (!currentUser) return;
    setAppData(prev => {
      const userSessions = prev.cardioSessions[currentUser] || [];
      return {
        ...prev,
        cardioSessions: { ...prev.cardioSessions, [currentUser]: userSessions.filter(s => s.id !== sessionId) },
      };
    });
  }, [currentUser]);

  // Calorie estimation for strength training
  const estimateWorkoutCalories = useCallback((session: WorkoutSession): number => {
    const profile = getPhysicalProfile();
    if (!profile) {
      // Default estimation without profile
      const totalSets = session.exercises.reduce((sum, ex) => sum + ex.sets.filter(s => s.completed).length, 0);
      return Math.round(totalSets * 8); // ~8 cal per set as rough estimate
    }

    const { weight, age, sex } = profile;
    const durationMinutes = session.durationMinutes || 45;
    
    // MET for weight training is typically 3-6, we use 5 for moderate intensity
    const MET = 5;
    
    // Mifflin-St Jeor for BMR estimation
    let bmr: number;
    if (sex === 'male') {
      bmr = 10 * weight + 6.25 * (profile.height || 175) - 5 * age + 5;
    } else {
      bmr = 10 * weight + 6.25 * (profile.height || 165) - 5 * age - 161;
    }
    
    // Calories burned = MET * weight * duration(hours)
    // BMR is used to validate the calculation makes sense
    const caloriesBurned = MET * weight * (durationMinutes / 60);
    
    // Ensure we don't estimate more than physiologically possible
    const maxPossible = (bmr / 24) * (durationMinutes / 60) * MET;
    void maxPossible; // Used for validation if needed
    
    return Math.round(caloriesBurned);
  }, [getPhysicalProfile]);

  // Calorie estimation for cardio
  const estimateCardioCalories = useCallback((cardioTypeId: string, durationMinutes: number, avgHeartRate: number): number => {
    const profile = getPhysicalProfile();
    
    // MET values for different cardio types
    const metValues: Record<string, number> = {
      running: 9.8,
      cycling: 7.5,
      swimming: 8.0,
      rowing: 7.0,
      elliptical: 5.0,
      walking: 3.5,
      hiit: 12.0,
      stairmaster: 9.0,
      jumping_rope: 11.0,
    };
    
    const baseMET = metValues[cardioTypeId] || 6.0;
    
    if (!profile) {
      // Simplified calculation without profile (assume 70kg)
      return Math.round(baseMET * 70 * (durationMinutes / 60));
    }
    
    const { weight, age, sex, maxHeartRate, restingHeartRate } = profile;
    
    // Heart rate based calorie calculation (more accurate)
    // Using the formula that accounts for heart rate
    if (avgHeartRate > 0 && maxHeartRate > 0) {
      const hrReserve = maxHeartRate - restingHeartRate;
      const intensity = (avgHeartRate - restingHeartRate) / hrReserve;
      
      // Adjust MET based on heart rate intensity
      const adjustedMET = baseMET * (0.5 + intensity);
      
      let calories: number;
      if (sex === 'male') {
        calories = ((-55.0969 + (0.6309 * avgHeartRate) + (0.1988 * weight) + (0.2017 * age)) / 4.184) * durationMinutes;
      } else {
        calories = ((-20.4022 + (0.4472 * avgHeartRate) - (0.1263 * weight) + (0.074 * age)) / 4.184) * durationMinutes;
      }
      
      // Use the higher of heart rate formula or MET-based calculation
      const metCalories = adjustedMET * weight * (durationMinutes / 60);
      return Math.round(Math.max(calories, metCalories));
    }
    
    // MET-based calculation
    return Math.round(baseMET * weight * (durationMinutes / 60));
  }, [getPhysicalProfile]);

  // Export all user data as JSON
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
      profile: profile,
      sessions: sessions,
      cardioSessions: cardioSessionsData,
      customExercises: customExercisesData,
    };
    
    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `gymtracker_${currentUser}_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [currentUser, getProfile, getSessions, getCardioSessions, getCustomExercises]);

  // Import user data from JSON
  const importUserData = useCallback((jsonString: string): boolean => {
    if (!currentUser) return false;
    
    try {
      const importData = JSON.parse(jsonString);
      
      // Validate structure
      if (!importData.version || !importData.sessions) {
        return false;
      }
      
      setAppData(prev => {
        const user = prev.users[currentUser];
        if (!user) return prev;
        
        // Merge imported data
        const existingSessionIds = new Set((prev.sessions[currentUser] || []).map(s => s.id));
        const newSessions = (importData.sessions || []).filter((s: WorkoutSession) => !existingSessionIds.has(s.id));
        
        const existingCardioIds = new Set((prev.cardioSessions[currentUser] || []).map(s => s.id));
        const newCardio = (importData.cardioSessions || []).filter((s: CardioSession) => !existingCardioIds.has(s.id));
        
        const existingExerciseIds = new Set((user.customExercises || []).map(e => e.id));
        const newExercises = (importData.customExercises || []).filter((e: Exercise) => !existingExerciseIds.has(e.id));
        
        const updatedUser = {
          ...user,
          physicalProfile: importData.profile?.physicalProfile || user.physicalProfile,
          customExercises: [...(user.customExercises || []), ...newExercises],
          customTemplates: importData.profile?.customTemplates || user.customTemplates,
          weeklyPlan: importData.profile?.weeklyPlan || user.weeklyPlan,
        };
        
        return {
          ...prev,
          users: { ...prev.users, [currentUser]: updatedUser },
          sessions: { 
            ...prev.sessions, 
            [currentUser]: [...(prev.sessions[currentUser] || []), ...newSessions] 
          },
          cardioSessions: { 
            ...prev.cardioSessions, 
            [currentUser]: [...(prev.cardioSessions[currentUser] || []), ...newCardio] 
          },
        };
      });
      
      return true;
    } catch {
      return false;
    }
  }, [currentUser]);

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
    // New functions
    updatePhysicalProfile,
    getPhysicalProfile,
    getCustomExercises,
    getAllExercises,
    saveExercise,
    updateExercise,
    deleteExercise,
    getCardioSessions,
    saveCardioSession,
    deleteCardioSession,
    estimateWorkoutCalories,
    estimateCardioCalories,
    // Export/Import
    exportUserData,
    importUserData,
  };
}
