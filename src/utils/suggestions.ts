import type { WorkoutSession } from '../types';

export interface SuggestedSet {
  reps: number;
  weight: number;
}

export function progressiveOverload(
  sessions: WorkoutSession[],
  exerciseId: string,
  numSets: number,
  defaultReps: number,
  defaultWeight: number,
): SuggestedSet[] {
  const recent = sessions
    .filter((s) => s.completed && s.exercises.some((e) => e.exerciseId === exerciseId))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 3);

  if (recent.length === 0) {
    return Array.from({ length: numSets }, () => ({ reps: defaultReps, weight: defaultWeight }));
  }

  const lastSession = recent[0];
  const lastExercise = lastSession.exercises.find((e) => e.exerciseId === exerciseId);
  if (!lastExercise || lastExercise.sets.length === 0) {
    return Array.from({ length: numSets }, () => ({ reps: defaultReps, weight: defaultWeight }));
  }

  const completedSets = lastExercise.sets.filter((s) => s.completed && !s.isWarmup);
  if (completedSets.length === 0) {
    return Array.from({ length: numSets }, () => ({ reps: defaultReps, weight: defaultWeight }));
  }

  const allCompleted = lastExercise.sets.filter((s) => !s.isWarmup).every((s) => s.completed);
  const avgWeight = completedSets.reduce((sum, s) => sum + s.weight, 0) / completedSets.length;
  const avgReps = completedSets.reduce((sum, s) => sum + s.reps, 0) / completedSets.length;

  const isBodyweight = avgWeight === 0;
  const suggestedWeight = allCompleted && !isBodyweight
    ? Math.round((avgWeight + 2.5) * 2) / 2
    : avgWeight;
  const suggestedReps = allCompleted && isBodyweight
    ? Math.round(avgReps) + 1
    : Math.round(avgReps);

  return Array.from({ length: numSets }, (_, i) => {
    if (i < completedSets.length) {
      const prev = completedSets[i];
      return {
        reps: allCompleted ? suggestedReps : prev.reps,
        weight: allCompleted ? suggestedWeight : prev.weight,
      };
    }
    return { reps: suggestedReps, weight: suggestedWeight };
  });
}