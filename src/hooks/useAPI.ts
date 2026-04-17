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

export function useAPI() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<PhysicalProfile | null>(null);
  const [settings, setSettings] = useState<UserSettings>({ daysPerWeek: 3, setsPerDay: 14 });
  const [customExercises, setCustomExercises] = useState<Exercise[]>([]);
  const [workouts, setWorkouts] = useState<WorkoutSession[]>([]);
  const [cardioSessions, setCardioSessions] = useState<CardioSession[]>([]);
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyPlanDay[]>([]);

  // Check for stored user on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('gym_tracker_user');
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
      loadUserData(parsedUser.id);
    } else {
      setLoading(false);
    }
  }, []);

  const loadUserData = async (userId: string) => {
    setLoading(true);
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
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = useCallback(async (username: string) => {
    try {
      const userData = await userAPI.login(username);
      setUser(userData);
      localStorage.setItem('gym_tracker_user', JSON.stringify(userData));
      await loadUserData(userData.id);
      return true;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setProfile(null);
    setSettings({ daysPerWeek: 3, setsPerDay: 14 });
    setCustomExercises([]);
    setWorkouts([]);
    setCardioSessions([]);
    setTemplates([]);
    setWeeklyPlan([]);
    localStorage.removeItem('gym_tracker_user');
  }, []);

  // Profile
  const updateProfile = useCallback(async (newProfile: PhysicalProfile) => {
    if (!user) return;
    try {
      await userAPI.updateProfile(user.id, newProfile);
      setProfile(newProfile);
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  }, [user]);

  // Settings
  const updateSettings = useCallback(async (newSettings: UserSettings) => {
    if (!user) return;
    try {
      await userAPI.updateSettings(user.id, newSettings);
      setSettings(newSettings);
    } catch (error) {
      console.error('Error updating settings:', error);
    }
  }, [user]);

  // Custom Exercises
  const addCustomExercise = useCallback(async (exercise: Omit<Exercise, 'id' | 'isCustom'>) => {
    if (!user) return;
    try {
      const newExercise = await exercisesAPI.create(user.id, exercise);
      setCustomExercises(prev => [...prev, newExercise]);
      return newExercise;
    } catch (error) {
      console.error('Error adding exercise:', error);
    }
  }, [user]);

  const updateCustomExercise = useCallback(async (exerciseId: string, exercise: Partial<Exercise>) => {
    if (!user) return;
    try {
      const updated = await exercisesAPI.update(user.id, exerciseId, exercise);
      setCustomExercises(prev => prev.map(e => e.id === exerciseId ? updated : e));
      return updated;
    } catch (error) {
      console.error('Error updating exercise:', error);
    }
  }, [user]);

  const deleteCustomExercise = useCallback(async (exerciseId: string) => {
    if (!user) return;
    try {
      await exercisesAPI.delete(user.id, exerciseId);
      setCustomExercises(prev => prev.filter(e => e.id !== exerciseId));
    } catch (error) {
      console.error('Error deleting exercise:', error);
    }
  }, [user]);

  // Workouts
  const addWorkout = useCallback(async (workout: Omit<WorkoutSession, 'id'>) => {
    if (!user) return;
    try {
      const newWorkout = await workoutsAPI.create(user.id, workout);
      setWorkouts(prev => [newWorkout, ...prev]);
      return newWorkout;
    } catch (error) {
      console.error('Error adding workout:', error);
    }
  }, [user]);

  const updateWorkout = useCallback(async (workoutId: string, workout: Partial<WorkoutSession>) => {
    if (!user) return;
    try {
      await workoutsAPI.update(user.id, workoutId, workout);
      setWorkouts(prev => prev.map(w => w.id === workoutId ? { ...w, ...workout } : w));
    } catch (error) {
      console.error('Error updating workout:', error);
    }
  }, [user]);

  const deleteWorkout = useCallback(async (workoutId: string) => {
    if (!user) return;
    try {
      await workoutsAPI.delete(user.id, workoutId);
      setWorkouts(prev => prev.filter(w => w.id !== workoutId));
    } catch (error) {
      console.error('Error deleting workout:', error);
    }
  }, [user]);

  const getLastExerciseData = useCallback(async (exerciseId: string) => {
    if (!user) return null;
    try {
      return await workoutsAPI.getLastExerciseData(user.id, exerciseId);
    } catch (error) {
      console.error('Error getting last exercise data:', error);
      return null;
    }
  }, [user]);

  // Cardio
  const addCardioSession = useCallback(async (session: Omit<CardioSession, 'id'>) => {
    if (!user) return;
    try {
      const newSession = await cardioAPI.create(user.id, session);
      setCardioSessions(prev => [newSession, ...prev]);
      return newSession;
    } catch (error) {
      console.error('Error adding cardio session:', error);
    }
  }, [user]);

  const updateCardioSession = useCallback(async (sessionId: string, session: Partial<CardioSession>) => {
    if (!user) return;
    try {
      await cardioAPI.update(user.id, sessionId, session);
      setCardioSessions(prev => prev.map(s => s.id === sessionId ? { ...s, ...session } : s));
    } catch (error) {
      console.error('Error updating cardio session:', error);
    }
  }, [user]);

  const deleteCardioSession = useCallback(async (sessionId: string) => {
    if (!user) return;
    try {
      await cardioAPI.delete(user.id, sessionId);
      setCardioSessions(prev => prev.filter(s => s.id !== sessionId));
    } catch (error) {
      console.error('Error deleting cardio session:', error);
    }
  }, [user]);

  // Templates
  const addTemplate = useCallback(async (template: Omit<WorkoutTemplate, 'id'>) => {
    if (!user) return;
    try {
      const newTemplate = await templatesAPI.create(user.id, template);
      setTemplates(prev => [...prev, newTemplate]);
      return newTemplate;
    } catch (error) {
      console.error('Error adding template:', error);
    }
  }, [user]);

  const updateTemplate = useCallback(async (templateId: string, template: Partial<WorkoutTemplate>) => {
    if (!user) return;
    try {
      await templatesAPI.update(user.id, templateId, template);
      setTemplates(prev => prev.map(t => t.id === templateId ? { ...t, ...template } : t));
    } catch (error) {
      console.error('Error updating template:', error);
    }
  }, [user]);

  const deleteTemplate = useCallback(async (templateId: string) => {
    if (!user) return;
    try {
      await templatesAPI.delete(user.id, templateId);
      setTemplates(prev => prev.filter(t => t.id !== templateId));
    } catch (error) {
      console.error('Error deleting template:', error);
    }
  }, [user]);

  const updateWeeklyPlan = useCallback(async (plan: WeeklyPlanDay[]) => {
    if (!user) return;
    try {
      await templatesAPI.updateWeeklyPlan(user.id, plan);
      setWeeklyPlan(plan);
    } catch (error) {
      console.error('Error updating weekly plan:', error);
    }
  }, [user]);

  // Export/Import
  const exportData = useCallback(async () => {
    if (!user) return null;
    try {
      return await userAPI.exportData(user.id);
    } catch (error) {
      console.error('Error exporting data:', error);
      return null;
    }
  }, [user]);

  const importData = useCallback(async (data: unknown) => {
    if (!user) return false;
    try {
      await userAPI.importData(user.id, data);
      await loadUserData(user.id);
      return true;
    } catch (error) {
      console.error('Error importing data:', error);
      return false;
    }
  }, [user]);

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
    updateCardioSession,
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
