import { useState, useEffect, useCallback } from 'react';
import { userAPI, exercisesAPI, workoutsAPI, cardioAPI, templatesAPI } from '../api/client';
import { 
  Exercise, 
  WorkoutSession, 
  CardioSession, 
  WorkoutTemplate, 
  PhysicalProfile
} from '../types';
import { EXERCISES } from '../data/exercises';

interface User {
  id: string;
  username: string;
}

interface UserSettings {
  daysPerWeek: number;
  setsPerDay: number;
}

interface WeeklyPlanDay {
  dayOfWeek: number;
  templateId: string | null;
}

const LOCAL_STORAGE_KEYS = {
  USER: 'gym_tracker_user',
  PROFILE: 'gym_tracker_profile',
  SETTINGS: 'gym_tracker_settings',
  EXERCISES: 'gym_tracker_exercises',
  WORKOUTS: 'gym_tracker_workouts',
  CARDIO: 'gym_tracker_cardio',
  TEMPLATES: 'gym_tracker_templates',
  WEEKLY_PLAN: 'gym_tracker_weekly_plan',
};

// Helper to detect if server is available
async function isServerAvailable(): Promise<boolean> {
  try {
    const response = await fetch('/api/users/login', { 
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: '__health_check__' })
    });
    return response.ok || response.status === 400;
  } catch {
    return false;
  }
}

// Local storage helpers
function getLocalData<T>(key: string, defaultValue: T): T {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function setLocalData<T>(key: string, data: T): void {
  localStorage.setItem(key, JSON.stringify(data));
}

export function useHybridStorage() {
  const [serverMode, setServerMode] = useState<boolean | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<PhysicalProfile | null>(null);
  const [settings, setSettings] = useState<UserSettings>({ daysPerWeek: 3, setsPerDay: 14 });
  const [customExercises, setCustomExercises] = useState<Exercise[]>([]);
  const [workouts, setWorkouts] = useState<WorkoutSession[]>([]);
  const [cardioSessions, setCardioSessions] = useState<CardioSession[]>([]);
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyPlanDay[]>([]);

  // Check server availability on mount
  useEffect(() => {
    const init = async () => {
      const serverAvailable = await isServerAvailable();
      setServerMode(serverAvailable);
      
      const storedUser = getLocalData<User | null>(LOCAL_STORAGE_KEYS.USER, null);
      if (storedUser) {
        setUser(storedUser);
        if (serverAvailable) {
          await loadServerData(storedUser.id);
        } else {
          loadLocalData(storedUser.username);
        }
      }
      setLoading(false);
    };
    init();
  }, []);

  const loadServerData = async (userId: string) => {
    try {
      const [
        profileData,
        settingsData,
        exercisesData,
        workoutsData,
        cardioData,
        templatesData,
        planData
      ] = await Promise.all([
        userAPI.getProfile(userId),
        userAPI.getSettings(userId),
        exercisesAPI.getCustom(userId),
        workoutsAPI.getAll(userId),
        cardioAPI.getAll(userId),
        templatesAPI.getAll(userId),
        templatesAPI.getWeeklyPlan(userId)
      ]);

      setProfile(profileData);
      setSettings(settingsData || { daysPerWeek: 3, setsPerDay: 14 });
      setCustomExercises(exercisesData || []);
      setWorkouts(workoutsData || []);
      setCardioSessions(cardioData || []);
      setTemplates(templatesData || []);
      setWeeklyPlan(planData || []);
    } catch (error) {
      console.error('Error loading server data:', error);
    }
  };

  const loadLocalData = (username: string) => {
    const userKey = `_${username}`;
    setProfile(getLocalData(`${LOCAL_STORAGE_KEYS.PROFILE}${userKey}`, null));
    setSettings(getLocalData(`${LOCAL_STORAGE_KEYS.SETTINGS}${userKey}`, { daysPerWeek: 3, setsPerDay: 14 }));
    setCustomExercises(getLocalData(`${LOCAL_STORAGE_KEYS.EXERCISES}${userKey}`, []));
    setWorkouts(getLocalData(`${LOCAL_STORAGE_KEYS.WORKOUTS}${userKey}`, []));
    setCardioSessions(getLocalData(`${LOCAL_STORAGE_KEYS.CARDIO}${userKey}`, []));
    setTemplates(getLocalData(`${LOCAL_STORAGE_KEYS.TEMPLATES}${userKey}`, []));
    setWeeklyPlan(getLocalData(`${LOCAL_STORAGE_KEYS.WEEKLY_PLAN}${userKey}`, []));
  };

  const saveLocalData = useCallback((username: string, key: string, data: unknown) => {
    const userKey = `_${username}`;
    setLocalData(`${key}${userKey}`, data);
  }, []);

  const login = useCallback(async (username: string) => {
    setLoading(true);
    try {
      if (serverMode) {
        const userData = await userAPI.login(username);
        setUser(userData);
        setLocalData(LOCAL_STORAGE_KEYS.USER, userData);
        await loadServerData(userData.id);
      } else {
        const userData: User = { id: username, username };
        setUser(userData);
        setLocalData(LOCAL_STORAGE_KEYS.USER, userData);
        loadLocalData(username);
      }
      setLoading(false);
      return true;
    } catch (error) {
      console.error('Login error:', error);
      // Fallback to local storage
      const userData: User = { id: username, username };
      setUser(userData);
      setLocalData(LOCAL_STORAGE_KEYS.USER, userData);
      loadLocalData(username);
      setLoading(false);
      return true;
    }
  }, [serverMode]);

  const logout = useCallback(() => {
    setUser(null);
    setProfile(null);
    setSettings({ daysPerWeek: 3, setsPerDay: 14 });
    setCustomExercises([]);
    setWorkouts([]);
    setCardioSessions([]);
    setTemplates([]);
    setWeeklyPlan([]);
    localStorage.removeItem(LOCAL_STORAGE_KEYS.USER);
  }, []);

  // Profile
  const updateProfile = useCallback(async (newProfile: PhysicalProfile) => {
    if (!user) return;
    try {
      if (serverMode) {
        await userAPI.updateProfile(user.id, newProfile);
      } else {
        saveLocalData(user.username, LOCAL_STORAGE_KEYS.PROFILE, newProfile);
      }
      setProfile(newProfile);
    } catch (error) {
      console.error('Error updating profile:', error);
      saveLocalData(user.username, LOCAL_STORAGE_KEYS.PROFILE, newProfile);
      setProfile(newProfile);
    }
  }, [user, serverMode, saveLocalData]);

  // Settings
  const updateSettings = useCallback(async (newSettings: UserSettings) => {
    if (!user) return;
    try {
      if (serverMode) {
        await userAPI.updateSettings(user.id, newSettings);
      } else {
        saveLocalData(user.username, LOCAL_STORAGE_KEYS.SETTINGS, newSettings);
      }
      setSettings(newSettings);
    } catch (error) {
      console.error('Error updating settings:', error);
      saveLocalData(user.username, LOCAL_STORAGE_KEYS.SETTINGS, newSettings);
      setSettings(newSettings);
    }
  }, [user, serverMode, saveLocalData]);

  // Custom Exercises
  const addCustomExercise = useCallback(async (exercise: Omit<Exercise, 'id' | 'isCustom'>) => {
    if (!user) return;
    try {
      let newExercise: Exercise;
      if (serverMode) {
        newExercise = await exercisesAPI.create(user.id, exercise);
      } else {
        newExercise = { ...exercise, id: `custom_${Date.now()}`, isCustom: true } as Exercise;
      }
      const updated = [...customExercises, newExercise];
      setCustomExercises(updated);
      if (!serverMode) {
        saveLocalData(user.username, LOCAL_STORAGE_KEYS.EXERCISES, updated);
      }
      return newExercise;
    } catch (error) {
      console.error('Error adding exercise:', error);
      const newExercise = { ...exercise, id: `custom_${Date.now()}`, isCustom: true } as Exercise;
      const updated = [...customExercises, newExercise];
      setCustomExercises(updated);
      saveLocalData(user.username, LOCAL_STORAGE_KEYS.EXERCISES, updated);
      return newExercise;
    }
  }, [user, serverMode, customExercises, saveLocalData]);

  const updateCustomExercise = useCallback(async (exerciseId: string, exercise: Partial<Exercise>) => {
    if (!user) return;
    try {
      if (serverMode) {
        await exercisesAPI.update(user.id, exerciseId, exercise);
      }
      const updated = customExercises.map(e => e.id === exerciseId ? { ...e, ...exercise } : e);
      setCustomExercises(updated);
      if (!serverMode) {
        saveLocalData(user.username, LOCAL_STORAGE_KEYS.EXERCISES, updated);
      }
    } catch (error) {
      console.error('Error updating exercise:', error);
      const updated = customExercises.map(e => e.id === exerciseId ? { ...e, ...exercise } : e);
      setCustomExercises(updated);
      saveLocalData(user.username, LOCAL_STORAGE_KEYS.EXERCISES, updated);
    }
  }, [user, serverMode, customExercises, saveLocalData]);

  const deleteCustomExercise = useCallback(async (exerciseId: string) => {
    if (!user) return;
    try {
      if (serverMode) {
        await exercisesAPI.delete(user.id, exerciseId);
      }
      const updated = customExercises.filter(e => e.id !== exerciseId);
      setCustomExercises(updated);
      if (!serverMode) {
        saveLocalData(user.username, LOCAL_STORAGE_KEYS.EXERCISES, updated);
      }
    } catch (error) {
      console.error('Error deleting exercise:', error);
      const updated = customExercises.filter(e => e.id !== exerciseId);
      setCustomExercises(updated);
      saveLocalData(user.username, LOCAL_STORAGE_KEYS.EXERCISES, updated);
    }
  }, [user, serverMode, customExercises, saveLocalData]);

  // Workouts
  const addWorkout = useCallback(async (workout: Omit<WorkoutSession, 'id'>) => {
    if (!user) return;
    try {
      let newWorkout: WorkoutSession;
      if (serverMode) {
        newWorkout = await workoutsAPI.create(user.id, workout);
      } else {
        newWorkout = { ...workout, id: `workout_${Date.now()}` } as WorkoutSession;
      }
      const updated = [newWorkout, ...workouts];
      setWorkouts(updated);
      if (!serverMode) {
        saveLocalData(user.username, LOCAL_STORAGE_KEYS.WORKOUTS, updated);
      }
      return newWorkout;
    } catch (error) {
      console.error('Error adding workout:', error);
      const newWorkout = { ...workout, id: `workout_${Date.now()}` } as WorkoutSession;
      const updated = [newWorkout, ...workouts];
      setWorkouts(updated);
      saveLocalData(user.username, LOCAL_STORAGE_KEYS.WORKOUTS, updated);
      return newWorkout;
    }
  }, [user, serverMode, workouts, saveLocalData]);

  const updateWorkout = useCallback(async (workoutId: string, workout: Partial<WorkoutSession>) => {
    if (!user) return;
    try {
      if (serverMode) {
        await workoutsAPI.update(user.id, workoutId, workout);
      }
      const updated = workouts.map(w => w.id === workoutId ? { ...w, ...workout } : w);
      setWorkouts(updated);
      if (!serverMode) {
        saveLocalData(user.username, LOCAL_STORAGE_KEYS.WORKOUTS, updated);
      }
    } catch (error) {
      console.error('Error updating workout:', error);
      const updated = workouts.map(w => w.id === workoutId ? { ...w, ...workout } : w);
      setWorkouts(updated);
      saveLocalData(user.username, LOCAL_STORAGE_KEYS.WORKOUTS, updated);
    }
  }, [user, serverMode, workouts, saveLocalData]);

  const deleteWorkout = useCallback(async (workoutId: string) => {
    if (!user) return;
    try {
      if (serverMode) {
        await workoutsAPI.delete(user.id, workoutId);
      }
      const updated = workouts.filter(w => w.id !== workoutId);
      setWorkouts(updated);
      if (!serverMode) {
        saveLocalData(user.username, LOCAL_STORAGE_KEYS.WORKOUTS, updated);
      }
    } catch (error) {
      console.error('Error deleting workout:', error);
      const updated = workouts.filter(w => w.id !== workoutId);
      setWorkouts(updated);
      saveLocalData(user.username, LOCAL_STORAGE_KEYS.WORKOUTS, updated);
    }
  }, [user, serverMode, workouts, saveLocalData]);

  const getLastExerciseData = useCallback(async (exerciseId: string) => {
    if (!user) return null;
    try {
      if (serverMode) {
        return await workoutsAPI.getLastExerciseData(user.id, exerciseId);
      } else {
        // Find last workout with this exercise
        for (const workout of workouts) {
          const exercise = workout.exercises.find(e => e.exerciseId === exerciseId);
          if (exercise) {
            return {
              date: workout.date,
              sets: exercise.sets.map(s => ({ reps: s.reps, weight: s.weight }))
            };
          }
        }
        return null;
      }
    } catch (error) {
      console.error('Error getting last exercise data:', error);
      return null;
    }
  }, [user, serverMode, workouts]);

  // Cardio
  const addCardioSession = useCallback(async (session: Omit<CardioSession, 'id'>) => {
    if (!user) return;
    try {
      let newSession: CardioSession;
      if (serverMode) {
        newSession = await cardioAPI.create(user.id, session);
      } else {
        newSession = { ...session, id: `cardio_${Date.now()}` } as CardioSession;
      }
      const updated = [newSession, ...cardioSessions];
      setCardioSessions(updated);
      if (!serverMode) {
        saveLocalData(user.username, LOCAL_STORAGE_KEYS.CARDIO, updated);
      }
      return newSession;
    } catch (error) {
      console.error('Error adding cardio session:', error);
      const newSession = { ...session, id: `cardio_${Date.now()}` } as CardioSession;
      const updated = [newSession, ...cardioSessions];
      setCardioSessions(updated);
      saveLocalData(user.username, LOCAL_STORAGE_KEYS.CARDIO, updated);
      return newSession;
    }
  }, [user, serverMode, cardioSessions, saveLocalData]);

  const deleteCardioSession = useCallback(async (sessionId: string) => {
    if (!user) return;
    try {
      if (serverMode) {
        await cardioAPI.delete(user.id, sessionId);
      }
      const updated = cardioSessions.filter(s => s.id !== sessionId);
      setCardioSessions(updated);
      if (!serverMode) {
        saveLocalData(user.username, LOCAL_STORAGE_KEYS.CARDIO, updated);
      }
    } catch (error) {
      console.error('Error deleting cardio session:', error);
      const updated = cardioSessions.filter(s => s.id !== sessionId);
      setCardioSessions(updated);
      saveLocalData(user.username, LOCAL_STORAGE_KEYS.CARDIO, updated);
    }
  }, [user, serverMode, cardioSessions, saveLocalData]);

  // Templates
  const addTemplate = useCallback(async (template: Omit<WorkoutTemplate, 'id'>) => {
    if (!user) return;
    try {
      let newTemplate: WorkoutTemplate;
      if (serverMode) {
        newTemplate = await templatesAPI.create(user.id, template);
      } else {
        newTemplate = { ...template, id: `template_${Date.now()}` } as WorkoutTemplate;
      }
      const updated = [...templates, newTemplate];
      setTemplates(updated);
      if (!serverMode) {
        saveLocalData(user.username, LOCAL_STORAGE_KEYS.TEMPLATES, updated);
      }
      return newTemplate;
    } catch (error) {
      console.error('Error adding template:', error);
      const newTemplate = { ...template, id: `template_${Date.now()}` } as WorkoutTemplate;
      const updated = [...templates, newTemplate];
      setTemplates(updated);
      saveLocalData(user.username, LOCAL_STORAGE_KEYS.TEMPLATES, updated);
      return newTemplate;
    }
  }, [user, serverMode, templates, saveLocalData]);

  const updateTemplate = useCallback(async (templateId: string, template: Partial<WorkoutTemplate>) => {
    if (!user) return;
    try {
      if (serverMode) {
        await templatesAPI.update(user.id, templateId, template);
      }
      const updated = templates.map(t => t.id === templateId ? { ...t, ...template } : t);
      setTemplates(updated);
      if (!serverMode) {
        saveLocalData(user.username, LOCAL_STORAGE_KEYS.TEMPLATES, updated);
      }
    } catch (error) {
      console.error('Error updating template:', error);
      const updated = templates.map(t => t.id === templateId ? { ...t, ...template } : t);
      setTemplates(updated);
      saveLocalData(user.username, LOCAL_STORAGE_KEYS.TEMPLATES, updated);
    }
  }, [user, serverMode, templates, saveLocalData]);

  const deleteTemplate = useCallback(async (templateId: string) => {
    if (!user) return;
    try {
      if (serverMode) {
        await templatesAPI.delete(user.id, templateId);
      }
      const updated = templates.filter(t => t.id !== templateId);
      setTemplates(updated);
      if (!serverMode) {
        saveLocalData(user.username, LOCAL_STORAGE_KEYS.TEMPLATES, updated);
      }
    } catch (error) {
      console.error('Error deleting template:', error);
      const updated = templates.filter(t => t.id !== templateId);
      setTemplates(updated);
      saveLocalData(user.username, LOCAL_STORAGE_KEYS.TEMPLATES, updated);
    }
  }, [user, serverMode, templates, saveLocalData]);

  const updateWeeklyPlan = useCallback(async (plan: WeeklyPlanDay[]) => {
    if (!user) return;
    try {
      if (serverMode) {
        await templatesAPI.updateWeeklyPlan(user.id, plan);
      } else {
        saveLocalData(user.username, LOCAL_STORAGE_KEYS.WEEKLY_PLAN, plan);
      }
      setWeeklyPlan(plan);
    } catch (error) {
      console.error('Error updating weekly plan:', error);
      saveLocalData(user.username, LOCAL_STORAGE_KEYS.WEEKLY_PLAN, plan);
      setWeeklyPlan(plan);
    }
  }, [user, serverMode, saveLocalData]);

  // Export/Import
  const exportData = useCallback(async () => {
    if (!user) return null;
    try {
      if (serverMode) {
        return await userAPI.exportData(user.id);
      } else {
        return {
          user,
          profile,
          settings,
          customExercises,
          workouts,
          cardioSessions,
          templates,
          weeklyPlan,
          exportDate: new Date().toISOString()
        };
      }
    } catch (error) {
      console.error('Error exporting data:', error);
      return {
        user,
        profile,
        settings,
        customExercises,
        workouts,
        cardioSessions,
        templates,
        weeklyPlan,
        exportDate: new Date().toISOString()
      };
    }
  }, [user, serverMode, profile, settings, customExercises, workouts, cardioSessions, templates, weeklyPlan]);

  const importData = useCallback(async (data: {
    profile?: PhysicalProfile;
    settings?: UserSettings;
    customExercises?: Exercise[];
    workouts?: WorkoutSession[];
    cardioSessions?: CardioSession[];
    templates?: WorkoutTemplate[];
    weeklyPlan?: WeeklyPlanDay[];
  }) => {
    if (!user) return false;
    try {
      if (serverMode) {
        await userAPI.importData(user.id, data);
        await loadServerData(user.id);
      } else {
        if (data.profile) {
          setProfile(data.profile);
          saveLocalData(user.username, LOCAL_STORAGE_KEYS.PROFILE, data.profile);
        }
        if (data.settings) {
          setSettings(data.settings);
          saveLocalData(user.username, LOCAL_STORAGE_KEYS.SETTINGS, data.settings);
        }
        if (data.customExercises) {
          const merged = [...customExercises, ...data.customExercises.filter(e => !customExercises.find(ce => ce.id === e.id))];
          setCustomExercises(merged);
          saveLocalData(user.username, LOCAL_STORAGE_KEYS.EXERCISES, merged);
        }
        if (data.workouts) {
          const merged = [...workouts, ...data.workouts.filter(w => !workouts.find(wk => wk.id === w.id))];
          setWorkouts(merged);
          saveLocalData(user.username, LOCAL_STORAGE_KEYS.WORKOUTS, merged);
        }
        if (data.cardioSessions) {
          const merged = [...cardioSessions, ...data.cardioSessions.filter(c => !cardioSessions.find(cs => cs.id === c.id))];
          setCardioSessions(merged);
          saveLocalData(user.username, LOCAL_STORAGE_KEYS.CARDIO, merged);
        }
        if (data.templates) {
          const merged = [...templates, ...data.templates.filter(t => !templates.find(tp => tp.id === t.id))];
          setTemplates(merged);
          saveLocalData(user.username, LOCAL_STORAGE_KEYS.TEMPLATES, merged);
        }
        if (data.weeklyPlan) {
          setWeeklyPlan(data.weeklyPlan);
          saveLocalData(user.username, LOCAL_STORAGE_KEYS.WEEKLY_PLAN, data.weeklyPlan);
        }
      }
      return true;
    } catch (error) {
      console.error('Error importing data:', error);
      return false;
    }
  }, [user, serverMode, saveLocalData, customExercises, workouts, cardioSessions, templates]);

  // Get all exercises (built-in + custom)
  const getAllExercises = useCallback((): Exercise[] => {
    return [...EXERCISES, ...customExercises];
  }, [customExercises]);

  return {
    // State
    user,
    loading,
    profile,
    settings,
    customExercises,
    workouts,
    cardioSessions,
    templates,
    weeklyPlan,
    serverMode,

    // Auth
    login,
    logout,

    // Profile & Settings
    updateProfile,
    updateSettings,

    // Exercises
    addCustomExercise,
    updateCustomExercise,
    deleteCustomExercise,
    getAllExercises,

    // Workouts
    addWorkout,
    updateWorkout,
    deleteWorkout,
    getLastExerciseData,

    // Cardio
    addCardioSession,
    deleteCardioSession,

    // Templates
    addTemplate,
    updateTemplate,
    deleteTemplate,
    updateWeeklyPlan,

    // Export/Import
    exportData,
    importData,
  };
}
