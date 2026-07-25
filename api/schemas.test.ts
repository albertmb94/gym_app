import { describe, it, expect } from 'vitest';
import { userDataSchema, userProfileSchema, workoutSessionSchema } from './schemas';

describe('API schemas', () => {
  it('accepts a valid user profile', () => {
    const result = userProfileSchema.safeParse({
      userId: 'alice',
      username: 'alice',
      createdAt: '2025-01-01T00:00:00.000Z',
      weeklyPlan: { daysPerWeek: 3, days: [] },
      customTemplates: [],
      customExercises: [],
      hiddenExerciseIds: [],
    });
    expect(result.success).toBe(true);
  });

  it('rejects user profile with invalid weight', () => {
    const result = userProfileSchema.safeParse({
      userId: 'alice',
      username: 'alice',
      createdAt: '2025-01-01T00:00:00.000Z',
      weeklyPlan: { daysPerWeek: 3, days: [] },
      customTemplates: [],
      customExercises: [],
      hiddenExerciseIds: [],
      physicalProfile: { height: 180, weight: 5, age: 30, sex: 'male', restingHeartRate: 60, maxHeartRate: 190 },
    });
    expect(result.success).toBe(false);
  });

  it('accepts valid workout session', () => {
    const result = workoutSessionSchema.safeParse({
      id: 's1',
      date: '2025-01-01T00:00:00Z',
      type: 'push',
      name: 'Push',
      exercises: [
        { id: 'e1', exerciseId: 'bench', sets: [{ id: 's1', reps: 8, weight: 50, completed: true }] },
      ],
      completed: true,
    });
    expect(result.success).toBe(true);
  });

  it('rejects workout session with too many exercises', () => {
    const exercises = Array.from({ length: 41 }, (_, i) => ({
      id: `e${i}`,
      exerciseId: 'bench',
      sets: [{ id: 's1', reps: 8, weight: 50, completed: true }],
    }));
    const result = workoutSessionSchema.safeParse({
      id: 's1',
      date: '2025-01-01T00:00:00Z',
      type: 'push',
      name: 'Push',
      exercises,
      completed: true,
    });
    expect(result.success).toBe(false);
  });

  it('accepts valid full app data', () => {
    const result = userDataSchema.safeParse({
      users: {
        alice: {
          userId: 'alice',
          username: 'alice',
          createdAt: '2025-01-01T00:00:00.000Z',
          weeklyPlan: { daysPerWeek: 3, days: [] },
          customTemplates: [],
          customExercises: [],
          hiddenExerciseIds: [],
        },
      },
      sessions: { alice: [] },
      cardioSessions: { alice: [] },
    });
    expect(result.success).toBe(true);
  });

  it('rejects app data with too many users', () => {
    const users: Record<string, any> = {};
    for (let i = 0; i < 51; i++) {
      users[`u${i}`] = {
        userId: `u${i}`,
        username: `u${i}`,
        createdAt: '2025-01-01T00:00:00.000Z',
        weeklyPlan: { daysPerWeek: 3, days: [] },
        customTemplates: [],
        customExercises: [],
        hiddenExerciseIds: [],
      };
    }
    const result = userDataSchema.safeParse({ users, sessions: {}, cardioSessions: {} });
    expect(result.success).toBe(false);
  });
});
