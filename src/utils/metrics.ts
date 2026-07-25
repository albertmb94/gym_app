import type { WorkoutSession, ExerciseLog, SetLog, CardioSession, PhysicalProfile } from '../types';

export function setVolume(set: SetLog): number {
  return set.reps * set.weight;
}

export function exerciseVolume(ex: ExerciseLog, opts: { excludeWarmup?: boolean } = {}): number {
  return ex.sets
    .filter((s) => s.completed && (!opts.excludeWarmup || !s.isWarmup))
    .reduce((sum, s) => sum + setVolume(s), 0);
}

export function sessionVolume(s: WorkoutSession, opts: { excludeWarmup?: boolean } = {}): number {
  return s.exercises.reduce((sum, ex) => sum + exerciseVolume(ex, opts), 0);
}

export function completedSetCount(s: WorkoutSession, opts: { excludeWarmup?: boolean } = {}): number {
  return s.exercises.reduce(
    (sum, ex) => sum + ex.sets.filter((set) => set.completed && (!opts.excludeWarmup || !set.isWarmup)).length,
    0,
  );
}

export function totalSetCount(s: WorkoutSession): number {
  return s.exercises.reduce((sum, ex) => sum + ex.sets.length, 0);
}

export function cardioTotalCalories(sessions: CardioSession[]): number {
  return sessions.reduce((sum, s) => sum + s.caloriesBurned, 0);
}

export function bmi(profile: PhysicalProfile): number {
  const m = profile.height / 100;
  return profile.weight / (m * m);
}

export function maxHeartRateFromAge(age: number): number {
  return Math.round(208 - 0.7 * age);
}

export function heartRateReserve(p: PhysicalProfile): number {
  return Math.max(1, p.maxHeartRate - p.restingHeartRate);
}

export function heartRateZone(hr: number, profile: PhysicalProfile | null): { zone: number; label: string } {
  if (!profile) return { zone: 0, label: 'N/A' };
  const reserve = heartRateReserve(profile);
  const intensity = ((hr - profile.restingHeartRate) / reserve) * 100;
  if (intensity < 60) return { zone: 1, label: 'Z1' };
  if (intensity < 70) return { zone: 2, label: 'Z2' };
  if (intensity < 80) return { zone: 3, label: 'Z3' };
  if (intensity < 90) return { zone: 4, label: 'Z4' };
  return { zone: 5, label: 'Z5' };
}

export function estimateStrengthCalories(
  session: WorkoutSession,
  profile: PhysicalProfile | null,
): number {
  if (!profile) {
    const totalSets = completedSetCount(session, { excludeWarmup: true });
    return Math.round(totalSets * 8);
  }
  const MET = 5;
  const durationMinutes = session.durationMinutes && session.durationMinutes > 0
    ? session.durationMinutes
    : 45;
  return Math.round(MET * profile.weight * (durationMinutes / 60));
}

const CARDIO_MET: Record<string, number> = {
  running: 9.8,
  cycling: 7.5,
  swimming: 8.0,
  rowing: 7.0,
  elliptical: 5.0,
  walking: 3.5,
  hiit: 12.0,
  stairmaster: 9.0,
  jumping_rope: 11.0,
};

export function estimateCardioCalories(
  cardioTypeId: string,
  durationMinutes: number,
  avgHeartRate: number,
  profile: PhysicalProfile | null,
): number {
  const baseMET = CARDIO_MET[cardioTypeId] || 6.0;
  if (!profile) {
    return Math.round(baseMET * 70 * (durationMinutes / 60));
  }
  const reserve = heartRateReserve(profile);
  if (avgHeartRate > 0 && reserve > 1) {
    const intensity = Math.max(0, Math.min(1, (avgHeartRate - profile.restingHeartRate) / reserve));
    const adjustedMET = baseMET * (0.5 + intensity);
    const caloriesHR = profile.sex === 'male'
      ? ((-55.0969 + 0.6309 * avgHeartRate + 0.1988 * profile.weight + 0.2017 * profile.age) / 4.184) * durationMinutes
      : profile.sex === 'female'
        ? ((-20.4022 + 0.4472 * avgHeartRate - 0.1263 * profile.weight + 0.074 * profile.age) / 4.184) * durationMinutes
        : ((-37.7496 + 0.5391 * avgHeartRate + 0.0363 * profile.weight + 0.1379 * profile.age) / 4.184) * durationMinutes;
    const metCalories = adjustedMET * profile.weight * (durationMinutes / 60);
    return Math.round(Math.max(caloriesHR, metCalories));
  }
  return Math.round(baseMET * profile.weight * (durationMinutes / 60));
}