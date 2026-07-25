export type MuscleGroup =
  | 'pectoral'
  | 'triceps'
  | 'biceps'
  | 'shoulder'
  | 'back'
  | 'lats'
  | 'trapezius'
  | 'core'
  | 'quadriceps'
  | 'hamstrings'
  | 'glutes'
  | 'calves'
  | 'forearms'
  | 'adductor'
  | 'abductor';

export type WorkoutType = 'push' | 'pull' | 'legs' | 'upper' | 'lower' | 'full' | 'custom';

export type ThemeName = 'dark' | 'light' | 'black' | 'contrast';

export type Language = 'es' | 'en';

export interface Exercise {
  id: string;
  name: string;
  primaryMuscles: MuscleGroup[];
  secondaryMuscles: MuscleGroup[];
  workoutType: WorkoutType[];
  imageUrl: string;
  description: string;
  isCustom?: boolean;
}

export interface PhysicalProfile {
  height: number;
  weight: number;
  age: number;
  sex: 'male' | 'female' | 'other';
  restingHeartRate: number;
  maxHeartRate: number;
}

export interface CardioType {
  id: string;
  name: string;
  metValue: number;
  icon: string;
}

export interface GpxPoint {
  lat: number;
  lng: number;
  ele?: number;
  time?: string;
}

export interface GpxRoute {
  name?: string;
  points: GpxPoint[];
  distanceKm?: number;
  elevationGain?: number;
}

export interface CardioSession {
  id: string;
  date: string;
  cardioTypeId: string;
  duration: number;
  averageHeartRate: number;
  caloriesBurned: number;
  notes?: string;
  gpxRoute?: GpxRoute;
}

export interface SetLog {
  id: string;
  reps: number;
  weight: number;
  completed: boolean;
  isWarmup?: boolean;
  restSeconds?: number;
  rpe?: number;
}

export interface ExerciseLog {
  id: string;
  exerciseId: string;
  sets: SetLog[];
  notes?: string;
}

export interface WorkoutSession {
  id: string;
  date: string;
  type: WorkoutType;
  name: string;
  exercises: ExerciseLog[];
  durationMinutes?: number;
  completed: boolean;
  caloriesBurned?: number;
  notes?: string;
}

export interface TemplateSet {
  reps: number;
  weight: number;
}

export interface TemplateExercise {
  exerciseId: string;
  sets: TemplateSet[];
}

export interface WorkoutTemplate {
  id: string;
  name: string;
  type: WorkoutType;
  exercises: TemplateExercise[];
  totalSets: number;
}

export interface WeeklyPlan {
  daysPerWeek: number;
  days: {
    dayIndex: number;
    templateId: string | null;
  }[];
}

export interface UserPreferences {
  theme?: ThemeName;
  language?: Language;
  reduceMotion?: boolean;
  reduceTransparency?: boolean;
  units?: 'metric' | 'imperial';
}

export interface UserProfile {
  userId: string;
  username: string;
  displayName?: string;
  createdAt: string;
  weeklyPlan: WeeklyPlan;
  customTemplates: WorkoutTemplate[];
  physicalProfile?: PhysicalProfile;
  customExercises: Exercise[];
  hiddenExerciseIds: string[];
  preferences?: UserPreferences;
}

export interface AppData {
  users: Record<string, UserProfile>;
  sessions: Record<string, WorkoutSession[]>;
  cardioSessions: Record<string, CardioSession[]>;
  revision?: number;
}