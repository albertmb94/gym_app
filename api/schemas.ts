import { z } from 'zod';

export const muscleGroupSchema = z.enum([
  'pectoral', 'triceps', 'biceps', 'shoulder', 'back', 'lats',
  'trapezius', 'core', 'quadriceps', 'hamstrings', 'glutes',
  'calves', 'forearms', 'adductor', 'abductor',
]);

export const workoutTypeSchema = z.enum([
  'push', 'pull', 'legs', 'upper', 'lower', 'full', 'custom',
]);

export const setLogSchema = z.object({
  id: z.string().min(1).max(64),
  reps: z.number().finite().min(0).max(1000),
  weight: z.number().finite().min(0).max(2000),
  completed: z.boolean(),
  isWarmup: z.boolean().optional(),
});

export const exerciseLogSchema = z.object({
  id: z.string().min(1).max(64),
  exerciseId: z.string().min(1).max(64),
  sets: z.array(setLogSchema).max(50),
  notes: z.string().max(500).optional(),
});

export const workoutSessionSchema = z.object({
  id: z.string().min(1).max(64),
  date: z.string().min(8).max(40),
  type: workoutTypeSchema,
  name: z.string().min(1).max(120),
  exercises: z.array(exerciseLogSchema).max(40),
  durationMinutes: z.number().finite().min(0).max(1440).optional(),
  completed: z.boolean(),
  caloriesBurned: z.number().finite().min(0).max(20000).optional(),
});

export const gpxPointSchema = z.object({
  lat: z.number().finite().min(-90).max(90),
  lng: z.number().finite().min(-180).max(180),
  ele: z.number().finite().optional(),
  time: z.string().max(40).optional(),
});

export const gpxRouteSchema = z.object({
  name: z.string().max(120).optional(),
  points: z.array(gpxPointSchema).max(2000),
  distanceKm: z.number().finite().min(0).max(50000).optional(),
  elevationGain: z.number().finite().min(0).max(50000).optional(),
});

export const cardioSessionSchema = z.object({
  id: z.string().min(1).max(64),
  date: z.string().min(8).max(40),
  cardioTypeId: z.string().min(1).max(40),
  duration: z.number().finite().min(1).max(1440),
  averageHeartRate: z.number().finite().min(0).max(260),
  caloriesBurned: z.number().finite().min(0).max(20000),
  notes: z.string().max(500).optional(),
  gpxRoute: gpxRouteSchema.optional(),
});

export const templateSetSchema = z.object({
  reps: z.number().finite().min(0).max(1000),
  weight: z.number().finite().min(0).max(2000),
});

export const templateExerciseSchema = z.object({
  exerciseId: z.string().min(1).max(64),
  sets: z.array(templateSetSchema).max(50),
});

export const workoutTemplateSchema = z.object({
  id: z.string().min(1).max(64),
  name: z.string().min(1).max(120),
  type: workoutTypeSchema,
  exercises: z.array(templateExerciseSchema).max(40),
  totalSets: z.number().int().min(0).max(200),
});

export const weeklyPlanSchema = z.object({
  daysPerWeek: z.number().int().min(1).max(7),
  days: z.array(z.object({
    dayIndex: z.number().int().min(0).max(6),
    templateId: z.string().min(1).max(64).nullable(),
  })).max(7),
});

export const exerciseSchema = z.object({
  id: z.string().min(1).max(64),
  name: z.string().min(1).max(80),
  primaryMuscles: z.array(muscleGroupSchema).max(8),
  secondaryMuscles: z.array(muscleGroupSchema).max(8),
  workoutType: z.array(workoutTypeSchema).min(1).max(7),
  imageUrl: z.string().max(500),
  description: z.string().max(1000),
  isCustom: z.boolean().optional(),
});

export const physicalProfileSchema = z.object({
  height: z.number().finite().min(80).max(260),
  weight: z.number().finite().min(20).max(400),
  age: z.number().finite().min(10).max(120),
  sex: z.enum(['male', 'female', 'other']),
  restingHeartRate: z.number().finite().min(20).max(120),
  maxHeartRate: z.number().finite().min(100).max(240),
});

export const userProfileSchema = z.object({
  username: z.string().min(1).max(120),
  displayName: z.string().min(1).max(60).optional(),
  createdAt: z.string().min(8).max(40),
  weeklyPlan: weeklyPlanSchema,
  customTemplates: z.array(workoutTemplateSchema).max(50),
  physicalProfile: physicalProfileSchema.optional(),
  customExercises: z.array(exerciseSchema).max(100),
  hiddenExerciseIds: z.array(z.string().max(64)).max(500),
  preferences: z.object({
    theme: z.enum(['dark', 'light', 'black', 'contrast']).optional(),
    language: z.enum(['es', 'en']).optional(),
    reduceMotion: z.boolean().optional(),
    reduceTransparency: z.boolean().optional(),
  }).optional(),
});

export const userDataSchema = z.object({
  users: z.record(z.string().min(1).max(120), userProfileSchema).refine(
    (u) => Object.keys(u).length <= 50,
    { message: 'Too many users' },
  ),
  sessions: z.record(z.string().min(1).max(120), z.array(workoutSessionSchema).max(2000)).refine(
    (s) => Object.values(s).reduce((acc, arr) => acc + arr.length, 0) <= 20000,
    { message: 'Too many sessions' },
  ),
  cardioSessions: z.record(z.string().min(1).max(120), z.array(cardioSessionSchema).max(2000)).refine(
    (s) => Object.values(s).reduce((acc, arr) => acc + arr.length, 0) <= 20000,
    { message: 'Too many cardio sessions' },
  ),
  revision: z.number().int().min(0).optional(),
});

export type UserData = z.infer<typeof userDataSchema>;
export type ServerUserProfile = z.infer<typeof userProfileSchema>;
export type ServerWorkoutSession = z.infer<typeof workoutSessionSchema>;
export type ServerCardioSession = z.infer<typeof cardioSessionSchema>;