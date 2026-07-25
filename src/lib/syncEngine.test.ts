import { describe, it, expect } from 'vitest';
import { mergeServerData } from './syncEngine';
import type { AppData, UserProfile } from '../types';

const profile = (id: string): UserProfile => ({
  userId: id,
  username: id,
  createdAt: '2025-01-01T00:00:00.000Z',
  weeklyPlan: { daysPerWeek: 3, days: [] },
  customTemplates: [],
  customExercises: [],
  hiddenExerciseIds: [],
});

describe('syncEngine.mergeServerData', () => {
  it('unions sessions by id', () => {
    const local: AppData = {
      users: { alice: profile('alice') },
      sessions: { alice: [{ id: 's1', date: '2025-01-01T00:00:00Z', type: 'push', name: 'A', exercises: [], completed: true }] },
      cardioSessions: { alice: [] },
      revision: 1,
    };
    const remote: AppData = {
      users: { alice: profile('alice') },
      sessions: { alice: [{ id: 's2', date: '2025-01-02T00:00:00Z', type: 'push', name: 'B', exercises: [], completed: true }] },
      cardioSessions: { alice: [] },
      revision: 2,
    };
    const merged = mergeServerData(local, 'alice', remote);
    expect(merged.sessions.alice.map((s) => s.id).sort()).toEqual(['s1', 's2']);
    expect(merged.revision).toBe(2);
  });

  it('remote does not replace local when remote has no user', () => {
    const local: AppData = {
      users: { alice: profile('alice') },
      sessions: { alice: [] },
      cardioSessions: { alice: [] },
      revision: 1,
    };
    const remote: AppData = { users: {}, sessions: {}, cardioSessions: {} };
    const merged = mergeServerData(local, 'alice', remote);
    expect(merged).toEqual(local);
  });
});