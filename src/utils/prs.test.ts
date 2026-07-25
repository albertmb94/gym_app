import { describe, it, expect } from 'vitest';
import { computeExercisePRs, isNewPR, topExercisesByFrequency } from './prs';
import type { Exercise, WorkoutSession, ExerciseLog, SetLog } from '../types';

const set = (over: Partial<SetLog> = {}): SetLog => ({
  id: Math.random().toString(),
  reps: 8,
  weight: 50,
  completed: true,
  ...over,
});

const log = (exerciseId: string, sets: SetLog[]): ExerciseLog => ({
  id: Math.random().toString(),
  exerciseId,
  sets,
});

const session = (date: string, exercises: ExerciseLog[], completed = true): WorkoutSession => ({
  id: Math.random().toString(),
  date,
  type: 'push',
  name: 'test',
  exercises,
  completed,
});

const exercises: Exercise[] = [
  { id: 'bench', name: 'Bench', primaryMuscles: ['pectoral'], secondaryMuscles: [], workoutType: ['push'], imageUrl: '', description: '' },
  { id: 'squat', name: 'Squat', primaryMuscles: ['quadriceps'], secondaryMuscles: [], workoutType: ['legs'], imageUrl: '', description: '' },
];

describe('PRs', () => {
  it('returns null with no completed sessions', () => {
    expect(computeExercisePRs('bench', [])).toBeNull();
  });

  it('computes max weight, reps, volume, and e1RM', () => {
    const sessions = [
      session('2025-01-01T00:00:00Z', [log('bench', [set({ weight: 100, reps: 5 })])]),
      session('2025-01-08T00:00:00Z', [log('bench', [set({ weight: 110, reps: 3 })])]),
    ];
    const pr = computeExercisePRs('bench', sessions);
    expect(pr?.maxWeight.value).toBe(110);
    expect(pr?.maxReps.value).toBe(5);
    expect(pr?.maxVolume.value).toBeGreaterThan(0);
    expect(pr?.estimated1RM.value).toBeGreaterThan(110);
  });

  it('isNewPR detects improvements', () => {
    const sessions = [session('2025-01-01T00:00:00Z', [log('bench', [set({ weight: 100, reps: 5 })])])];
    const result = isNewPR('bench', 110, 6, 120, sessions);
    expect(result.weight).toBe(true);
    expect(result.reps).toBe(true);
    expect(result.e1rm).toBe(true);
  });

  it('isNewPR returns false when no improvement', () => {
    const sessions = [session('2025-01-01T00:00:00Z', [log('bench', [set({ weight: 100, reps: 5 })])])];
    const result = isNewPR('bench', 90, 5, 105, sessions);
    expect(result.weight).toBe(false);
  });

  it('topExercisesByFrequency ranks correctly', () => {
    const sessions = [
      session('2025-01-01', [log('bench', [set()]), log('squat', [set()])]),
      session('2025-01-02', [log('bench', [set()])]),
    ];
    const top = topExercisesByFrequency(sessions, (id) => exercises.find((e) => e.id === id));
    expect(top[0].exercise.id).toBe('bench');
    expect(top[0].count).toBe(2);
  });
});