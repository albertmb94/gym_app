import type { WorkoutSession, Exercise, ExerciseLog, SetLog } from '../types';

export interface PersonalRecord {
  exerciseId: string;
  maxWeight: { value: number; sessionId: string; date: string };
  maxVolume: { value: number; sessionId: string; date: string };
  maxReps: { value: number; sessionId: string; date: string };
  estimated1RM: { value: number; sessionId: string; date: string };
}

function getCompletedSets(ex: ExerciseLog, excludeWarmup: boolean): SetLog[] {
  return ex.sets.filter((s) => s.completed && (!excludeWarmup || !s.isWarmup));
}

function epley1RM(weight: number, reps: number): number {
  if (reps <= 0) return 0;
  return weight * (1 + reps / 30);
}

function emptyRecord(exerciseId: string): PersonalRecord {
  const empty = { value: 0, sessionId: '', date: '' };
  return {
    exerciseId,
    maxWeight: empty,
    maxVolume: empty,
    maxReps: empty,
    estimated1RM: empty,
  };
}

export function computeExercisePRs(
  exerciseId: string,
  sessions: WorkoutSession[],
): PersonalRecord | null {
  const completed = sessions
    .filter((s) => s.completed)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  let best: PersonalRecord | null = null;

  for (const session of completed) {
    const log = session.exercises.find((e) => e.exerciseId === exerciseId);
    if (!log) continue;
    const sets = getCompletedSets(log, true);
    if (sets.length === 0) continue;
    const sessionMaxWeight = Math.max(...sets.map((s) => s.weight));
    const sessionMaxReps = Math.max(...sets.map((s) => s.reps));
    const sessionVolume = sets.reduce((sum, s) => sum + s.weight * s.reps, 0);
    const sessionE1RM = Math.max(...sets.map((s) => epley1RM(s.weight, s.reps)));

    if (!best) best = emptyRecord(exerciseId);

    if (sessionMaxWeight > best.maxWeight.value) {
      best.maxWeight = { value: sessionMaxWeight, sessionId: session.id, date: session.date };
    }
    if (sessionMaxReps > best.maxReps.value) {
      best.maxReps = { value: sessionMaxReps, sessionId: session.id, date: session.date };
    }
    if (sessionVolume > best.maxVolume.value) {
      best.maxVolume = { value: sessionVolume, sessionId: session.id, date: session.date };
    }
    if (sessionE1RM > best.estimated1RM.value) {
      best.estimated1RM = { value: sessionE1RM, sessionId: session.id, date: session.date };
    }
  }

  return best;
}

export function isNewPR(
  exerciseId: string,
  newMaxWeight: number,
  newMaxReps: number,
  newEstimated1RM: number,
  sessions: WorkoutSession[],
): { weight: boolean; reps: boolean; e1rm: boolean } {
  const current = computeExercisePRs(exerciseId, sessions);
  if (!current) return { weight: true, reps: true, e1rm: true };
  return {
    weight: newMaxWeight > current.maxWeight.value,
    reps: newMaxReps > current.maxReps.value,
    e1rm: newEstimated1RM > current.estimated1RM.value,
  };
}

export function topExercisesByFrequency(
  sessions: WorkoutSession[],
  exerciseLookup: (id: string) => Exercise | undefined,
  limit = 5,
): Array<{ exercise: Exercise; count: number }> {
  const counts = new Map<string, number>();
  for (const session of sessions) {
    if (!session.completed) continue;
    for (const log of session.exercises) {
      counts.set(log.exerciseId, (counts.get(log.exerciseId) || 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .map(([id, count]) => ({ exercise: exerciseLookup(id)!, count }))
    .filter((entry) => entry.exercise)
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}