import { describe, it, expect } from 'vitest';
import { progressiveOverload } from './suggestions';
import type { WorkoutSession, ExerciseLog, SetLog } from '../types';

const set = (over: Partial<SetLog> = {}): SetLog => ({
  id: Math.random().toString(),
  reps: 8,
  weight: 50,
  completed: true,
  ...over,
});

const log = (sets: SetLog[]): ExerciseLog => ({
  id: 'e',
  exerciseId: 'squat',
  sets,
});

const session = (date: string, exercises: ExerciseLog[], completed = true): WorkoutSession => ({
  id: Math.random().toString(),
  date,
  type: 'legs',
  name: 'test',
  exercises,
  completed,
});

describe('progressiveOverload', () => {
  it('returns defaults when no history', () => {
    const result = progressiveOverload([], 'squat', 3, 8, 0);
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ reps: 8, weight: 0 });
  });

  it('keeps bodyweight at 0 even when all sets completed', () => {
    const sessions = [
      session('2025-01-01', [log([set({ weight: 0, reps: 10 }), set({ weight: 0, reps: 8 })])]),
    ];
    const result = progressiveOverload(sessions, 'squat', 2, 8, 0);
    expect(result[0].weight).toBe(0);
    expect(result[0].reps).toBe(10);
  });

  it('adds 2.5kg when all weighted sets completed', () => {
    const sessions = [
      session('2025-01-01', [log([set({ weight: 100, reps: 5 }), set({ weight: 100, reps: 5 })])]),
    ];
    const result = progressiveOverload(sessions, 'squat', 2, 5, 0);
    expect(result[0].weight).toBe(102.5);
  });

  it('preserves weights when not all completed', () => {
    const sessions = [
      session('2025-01-01', [log([set({ weight: 100, reps: 5 }), set({ weight: 100, reps: 5, completed: false })])]),
    ];
    const result = progressiveOverload(sessions, 'squat', 2, 5, 0);
    expect(result[0].weight).toBe(100);
  });
});