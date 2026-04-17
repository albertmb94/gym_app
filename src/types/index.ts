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
  | 'forearms';

export type WorkoutType = 'push' | 'pull' | 'legs' | 'upper' | 'lower' | 'full' | 'custom';

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
  height: number; // cm
  weight: number; // kg
  age: number;
  sex: 'male' | 'female';
  restingHeartRate: number; // bpm
  maxHeartRate: number; // bpm
}

export interface CardioType {
  id: string;
  name: string;
  metValue: number; // Metabolic Equivalent of Task
  icon: string;
}

export interface CardioSession {
  id: string;
  date: string;
  cardioTypeId: string;
  duration: number; // minutes
  averageHeartRate: number;
  caloriesBurned: number;
  notes?: string;
}

export interface SetLog {
  id: string;
  reps: number;
  weight: number; // kg
  completed: boolean;
}

export interface ExerciseLog {
  id: string;
  exerciseId: string;
  sets: SetLog[];
  notes?: string;
}

export interface WorkoutSession {
  id: string;
  date: string; // ISO string
  type: WorkoutType;
  name: string;
  exercises: ExerciseLog[];
  durationMinutes?: number;
  completed: boolean;
  caloriesBurned?: number;
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
    dayIndex: number; // 0=Mon, 1=Tue...
    templateId: string | null;
  }[];
}

export interface UserProfile {
  username: string;
  createdAt: string;
  weeklyPlan: WeeklyPlan;
  customTemplates: WorkoutTemplate[];
  physicalProfile?: PhysicalProfile;
  customExercises?: Exercise[];
}

export interface AppData {
  users: Record<string, UserProfile>;
  sessions: Record<string, WorkoutSession[]>; // keyed by username
  cardioSessions: Record<string, CardioSession[]>; // keyed by username
}
