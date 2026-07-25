import { describe, it, expect } from 'vitest';
import { loadAppData, saveAppData, clearAll } from './repository';

describe('repository', () => {
  it('returns default when nothing is stored', () => {
    clearAll();
    const data = loadAppData();
    expect(data.users).toEqual({});
    expect(data.sessions).toEqual({});
  });

  it('round-trips through save and load', () => {
    saveAppData({
      users: {
        alice: {
          userId: 'alice',
          username: 'alice',
          createdAt: '2025-01-01T00:00:00Z',
          weeklyPlan: { daysPerWeek: 3, days: [] },
          customTemplates: [],
          customExercises: [],
          hiddenExerciseIds: [],
        },
      },
      sessions: { alice: [] },
      cardioSessions: { alice: [] },
    });
    const data = loadAppData();
    expect(data.users.alice.username).toBe('alice');
    clearAll();
  });

  it('rejects invalid data and returns defaults', () => {
    localStorage.setItem('gymtracker.v2.appData', JSON.stringify({ invalid: true }));
    const data = loadAppData();
    expect(data.users).toEqual({});
    clearAll();
  });
});