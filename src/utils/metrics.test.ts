import { describe, it, expect } from 'vitest';
import { sessionVolume, exerciseVolume, completedSetCount, bmi, heartRateZone, estimateStrengthCalories, estimateCardioCalories, maxHeartRateFromAge } from './metrics';
import type { WorkoutSession, ExerciseLog, SetLog, PhysicalProfile } from '../types';

const set = (over: Partial<SetLog> = {}): SetLog => ({
  id: 's',
  reps: 8,
  weight: 50,
  completed: true,
  ...over,
});

const exercise = (sets: SetLog[]): ExerciseLog => ({
  id: 'e',
  exerciseId: 'ex',
  sets,
});

const session = (exercises: ExerciseLog[]): WorkoutSession => ({
  id: 'w',
  date: new Date().toISOString(),
  type: 'push',
  name: 'Test',
  exercises,
  completed: true,
});

const profile: PhysicalProfile = {
  height: 180,
  weight: 80,
  age: 30,
  sex: 'male',
  restingHeartRate: 60,
  maxHeartRate: 190,
};

describe('metrics', () => {
  it('calculates set and exercise volume', () => {
    expect(exerciseVolume(exercise([set({ weight: 50, reps: 8 }), set({ weight: 60, reps: 6 })]))).toBe(400 + 360);
  });

  it('excludes warmup when option enabled', () => {
    const ex = exercise([
      set({ reps: 10, weight: 20, isWarmup: true }),
      set({ reps: 8, weight: 50 }),
    ]);
    expect(exerciseVolume(ex, { excludeWarmup: true })).toBe(400);
    expect(exerciseVolume(ex)).toBe(600);
  });

  it('sessionVolume sums across exercises', () => {
    const s = session([
      exercise([set({ weight: 50, reps: 8 })]),
      exercise([set({ weight: 100, reps: 5 })]),
    ]);
    expect(sessionVolume(s)).toBe(400 + 500);
  });

  it('completedSetCount counts only completed sets', () => {
    const s = session([
      exercise([set({ reps: 5, weight: 100 }), set({ reps: 0, weight: 0, completed: false })]),
    ]);
    expect(completedSetCount(s)).toBe(1);
  });

  it('bmi is computed correctly', () => {
    expect(bmi({ ...profile, height: 180, weight: 80 })).toBeCloseTo(24.69, 1);
  });

  it('maxHeartRateFromAge uses Tanaka formula', () => {
    expect(maxHeartRateFromAge(30)).toBe(187);
  });

  it('heartRateZone returns N/A when no profile', () => {
    expect(heartRateZone(140, null).label).toBe('N/A');
  });

  it('heartRateZone classifies correctly with profile', () => {
    expect(heartRateZone(120, profile).zone).toBeGreaterThanOrEqual(1);
    expect(heartRateZone(180, profile).zone).toBe(5);
  });

  it('estimateStrengthCalories falls back without profile', () => {
    const s = session([exercise([set({ weight: 50, reps: 8 })])]);
    const c = estimateStrengthCalories(s, null);
    expect(c).toBe(8);
  });

  it('estimateStrengthCalories uses MET with profile', () => {
    const s = session([exercise([set({ weight: 50, reps: 8 })])]);
    s.durationMinutes = 60;
    expect(estimateStrengthCalories(s, profile)).toBe(400);
  });

  it('estimateCardioCalories handles edge cases', () => {
    expect(estimateCardioCalories('running', 30, 0, profile)).toBeGreaterThan(0);
    expect(estimateCardioCalories('running', 30, 0, null)).toBeGreaterThan(0);
    expect(estimateCardioCalories('running', 30, 200, null)).toBeGreaterThan(0);
  });
});