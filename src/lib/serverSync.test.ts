import { describe, it, expect } from 'vitest';
import { mergeServerData } from './serverSync';
import { AppData } from '../types';

function makeLocal(): AppData {
  return {
    users: {
      alice: {
        username: 'alice',
        createdAt: '2025-01-01T00:00:00.000Z',
        weeklyPlan: { daysPerWeek: 3, days: [] },
        customTemplates: [],
        physicalProfile: { height: 170, weight: 65, age: 30, sex: 'female', restingHeartRate: 60, maxHeartRate: 180 },
      },
    },
    sessions: {
      alice: [
        { id: 's1', date: '2025-01-02T00:00:00.000Z', type: 'push', name: 'Push A', exercises: [], completed: true },
      ],
    },
    cardioSessions: {},
  };
}

describe('mergeServerData', () => {
  it('applies remote data when it is newer than lastSyncedAt', () => {
    const local = makeLocal();
    const remote = {
      updatedAt: 2000,
      users: {
        alice: {
          ...local.users.alice,
          physicalProfile: { height: 160, weight: 65, age: 30, sex: 'female', restingHeartRate: 60, maxHeartRate: 180 },
        },
      },
      sessions: {
        alice: [
          { id: 's2', date: '2025-01-03T00:00:00.000Z', type: 'pull', name: 'Pull A', exercises: [], completed: true },
        ],
      },
    };
    const { merged, appliedRemote } = mergeServerData(local, 'alice', remote, 1000);
    expect(appliedRemote).toBe(true);
    expect(merged.users.alice.physicalProfile?.height).toBe(160);
    expect(merged.sessions.alice).toHaveLength(1);
    expect(merged.sessions.alice[0].id).toBe('s2');
  });

  it('keeps local data when it is newer than remote', () => {
    const local = makeLocal();
    const remote = {
      updatedAt: 500,
      users: {
        alice: {
          ...local.users.alice,
          physicalProfile: { height: 160, weight: 65, age: 30, sex: 'female', restingHeartRate: 60, maxHeartRate: 180 },
        },
      },
      sessions: { alice: [] },
    };
    const { merged, appliedRemote } = mergeServerData(local, 'alice', remote, 1000);
    expect(appliedRemote).toBe(false);
    expect(merged.users.alice.physicalProfile?.height).toBe(170);
    expect(merged.sessions.alice).toHaveLength(1);
  });

  it('does not affect other users', () => {
    const local = makeLocal();
    local.users.bob = {
      username: 'bob',
      createdAt: '2025-01-01T00:00:00.000Z',
      weeklyPlan: { daysPerWeek: 3, days: [] },
      customTemplates: [],
    };
    const remote = {
      updatedAt: 2000,
      users: {
        alice: {
          ...local.users.alice,
          physicalProfile: { height: 160, weight: 65, age: 30, sex: 'female', restingHeartRate: 60, maxHeartRate: 180 },
        },
      },
      sessions: { alice: [] },
    };
    const { merged } = mergeServerData(local, 'alice', remote, 1000);
    expect(merged.users.bob).toEqual(local.users.bob);
  });

  it('returns local unchanged when remote is null', () => {
    const local = makeLocal();
    const { merged, appliedRemote } = mergeServerData(local, 'alice', null, 1000);
    expect(appliedRemote).toBe(false);
    expect(merged).toEqual(local);
  });
});
