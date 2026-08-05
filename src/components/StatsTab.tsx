import { useState, useMemo } from 'react';
import { WorkoutSession, MuscleGroup, CardioSession } from '../types';
import { ALL_MUSCLES } from '../data/exercises';
import { useExercises } from '../contexts/ExercisesContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Legend,
} from 'recharts';
import { format } from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import { TrendingUp, BarChart2, Activity, Flame, Heart, X } from 'lucide-react';
import { EmptyState } from './ui/EmptyState';
import { Select } from './ui/Select';
import { cn } from '../utils/cn';

interface Props {
  sessions: WorkoutSession[];
  cardioSessions?: CardioSession[];
}

// Paleta de músculos — funciona en dark/light porque usa saturación media
const MUSCLE_COLORS: Record<string, string> = {
  pectoral: '#f97316', triceps: '#fb923c', biceps: '#3b82f6', shoulder: '#a78bfa',
  back: '#34d399', lats: '#10b981', trapezius: '#6ee7b7', core: '#fbbf24',
  quadriceps: '#ef4444', hamstrings: '#f87171', glutes: '#ec4899', calves: '#8b5cf6',
  forearms: '#94a3b8', adductor: '#22d3ee', abductor: '#f43f5e',
};

// Paleta de comparación — usa accent azul como color principal en lugar de naranja
const LINE_PALETTE = ['#0A84FF', '#22c55e', '#a855f7', '#ec4899', '#f59e0b', '#06b6d4'];

// Helper: leer CSS variables en tiempo de render para que Recharts respete el tema
function useChartColors() {
  const { theme } = useTheme();
  void theme; // re-render cuando cambia el tema
  if (typeof window === 'undefined') {
    return { grid: '#374151', axis: '#9ca3af', tooltipBg: '#1f2937', tooltipBorder: '#374151', tooltipText: '#f3f4f6' };
  }
  const style = getComputedStyle(document.documentElement);
  return {
    grid: style.getPropertyValue('--border-strong').trim() || '#374151',
    axis: style.getPropertyValue('--text-muted').trim() || '#9ca3af',
    tooltipBg: style.getPropertyValue('--surface-2').trim() || '#1f2937',
    tooltipBorder: style.getPropertyValue('--border-strong').trim() || '#374151',
    tooltipText: style.getPropertyValue('--text-primary').trim() || '#f3f4f6',
  };
}

type ViewMode = 'exercise' | 'muscle' | 'calories';
type MetricMode = 'maxWeight' | 'totalVolume' | 'totalReps';

export default function StatsTab({ sessions, cardioSessions = [] }: Props) {
  const { t, language } = useLanguage();
  const { allExercises, getExerciseById } = useExercises();
  const dateLocale = language === 'es' ? es : enUS;
  const chart = useChartColors();

  const [viewMode, setViewMode] = useState<ViewMode>('exercise');
  const [metric, setMetric] = useState<MetricMode>('maxWeight');

  // Single exercise mode
  const [selectedExerciseId, setSelectedExerciseId] = useState<string>('');

  // Multi-exercise compare mode
  const [compareMode, setCompareMode] = useState(false);
  const [compareExerciseIds, setCompareExerciseIds] = useState<string[]>([]);

  // Single muscle mode
  const [selectedMuscle, setSelectedMuscle] = useState<MuscleGroup>('pectoral');

  // Multi-muscle compare mode
  const [compareMuscleMode, setCompareMuscleMode] = useState(false);
  const [compareMuscleIds, setCompareMuscleIds] = useState<MuscleGroup[]>([]);

  const muscleLabels = t.muscles as Record<string, string>;

  const completedSessions = useMemo(() =>
    sessions.filter(s => s.completed).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [sessions]
  );

  // Exercises that appear in completed sessions
  const usedExercises = useMemo(() => {
    const ids = new Set<string>();
    completedSessions.forEach(s => s.exercises.forEach(e => ids.add(e.exerciseId)));
    return allExercises.filter(e => ids.has(e.id));
  }, [completedSessions, allExercises]);

  // Set default selected exercise once data is available
  const effectiveExerciseId = selectedExerciseId || usedExercises[0]?.id || '';

  // ── Single exercise data ───────────────────────────────────────────────────
  const exerciseData = useMemo(() => {
    if (!effectiveExerciseId) return [];
    return completedSessions
      .filter(s => s.exercises.some(e => e.exerciseId === effectiveExerciseId))
      .map(s => {
        const exLog = s.exercises.find(e => e.exerciseId === effectiveExerciseId)!;
        const done = exLog.sets.filter(s => s.completed);
        return {
          date: format(new Date(s.date), 'dd/MM', { locale: dateLocale }),
          fullDate: format(new Date(s.date), 'd MMM yy', { locale: dateLocale }),
          maxWeight: done.length ? Math.max(...done.map(s => s.weight)) : 0,
          totalVolume: done.reduce((sum, s) => sum + s.reps * s.weight, 0),
          totalReps: done.reduce((sum, s) => sum + s.reps, 0),
          sets: done.length,
        };
      });
  }, [completedSessions, effectiveExerciseId, dateLocale]);

  // ── Multi-exercise comparison data ────────────────────────────────────────
  const compareData = useMemo(() => {
    if (!compareExerciseIds.length) return [];
    const allDates = new Set<string>();
    const byExAndDate: Record<string, Record<string, number>> = {};

    compareExerciseIds.forEach(exId => {
      byExAndDate[exId] = {};
      completedSessions
        .filter(s => s.exercises.some(e => e.exerciseId === exId))
        .forEach(s => {
          const dateKey = format(new Date(s.date), 'dd/MM', { locale: dateLocale });
          allDates.add(dateKey);
          const exLog = s.exercises.find(e => e.exerciseId === exId)!;
          const done = exLog.sets.filter(s => s.completed);
          const value =
            metric === 'maxWeight' ? (done.length ? Math.max(...done.map(s => s.weight)) : 0)
            : metric === 'totalVolume' ? done.reduce((sum, s) => sum + s.reps * s.weight, 0)
            : done.reduce((sum, s) => sum + s.reps, 0);
          // If same date appears twice, take max
          byExAndDate[exId][dateKey] = Math.max(byExAndDate[exId][dateKey] || 0, value);
        });
    });

    const sortedDates = [...allDates].sort();
    return sortedDates.map(date => {
      const point: Record<string, string | number> = { date };
      compareExerciseIds.forEach(id => { point[id] = byExAndDate[id][date] ?? 0; });
      return point;
    });
  }, [completedSessions, compareExerciseIds, metric, dateLocale]);

  // ── Muscle frequency ──────────────────────────────────────────────────────
  const muscleFrequency = useMemo(() => {
    const freq: Record<string, number> = {};
    completedSessions.forEach(s => {
      const muscles = new Set<string>();
      s.exercises.forEach(exLog => {
        const ex = getExerciseById(exLog.exerciseId);
        if (!ex) return;
        ex.primaryMuscles.forEach(m => muscles.add(m));
        ex.secondaryMuscles.forEach(m => muscles.add(m));
      });
      muscles.forEach(m => { freq[m] = (freq[m] || 0) + 1; });
    });
    return ALL_MUSCLES
      .filter(m => freq[m])
      .map(m => ({ muscle: muscleLabels[m] || m, id: m, count: freq[m], color: MUSCLE_COLORS[m] }))
      .sort((a, b) => b.count - a.count);
  }, [completedSessions, getExerciseById, muscleLabels]);

  // ── Single muscle evolution ───────────────────────────────────────────────
  const muscleData = useMemo(() => {
    return completedSessions
      .filter(s => s.exercises.some(exLog => {
        const ex = getExerciseById(exLog.exerciseId);
        return ex && (ex.primaryMuscles.includes(selectedMuscle) || ex.secondaryMuscles.includes(selectedMuscle));
      }))
      .map(s => {
        let totalVol = 0, maxW = 0;
        s.exercises.forEach(exLog => {
          const ex = getExerciseById(exLog.exerciseId);
          if (!ex) return;
          if (!ex.primaryMuscles.includes(selectedMuscle) && !ex.secondaryMuscles.includes(selectedMuscle)) return;
          const done = exLog.sets.filter(s => s.completed);
          totalVol += done.reduce((sum, s) => sum + s.reps * s.weight, 0);
          maxW = Math.max(maxW, done.length ? Math.max(...done.map(s => s.weight)) : 0);
        });
        return {
          date: format(new Date(s.date), 'dd/MM', { locale: dateLocale }),
          fullDate: format(new Date(s.date), 'd MMM yy', { locale: dateLocale }),
          totalVolume: totalVol,
          maxWeight: maxW,
        };
      });
  }, [completedSessions, selectedMuscle, getExerciseById, dateLocale]);

  // ── Multi-muscle comparison data ─────────────────────────────────────────
  const compareMuscleData = useMemo(() => {
    if (!compareMuscleIds.length) return [];
    const allDates = new Set<string>();
    const byMuscleAndDate: Record<string, Record<string, number>> = {};

    compareMuscleIds.forEach(muscleId => {
      byMuscleAndDate[muscleId] = {};
      completedSessions
        .filter(s => s.exercises.some(exLog => {
          const ex = getExerciseById(exLog.exerciseId);
          return ex && (ex.primaryMuscles.includes(muscleId) || ex.secondaryMuscles.includes(muscleId));
        }))
        .forEach(s => {
          const dateKey = format(new Date(s.date), 'dd/MM', { locale: dateLocale });
          allDates.add(dateKey);
          let totalVol = 0;
          s.exercises.forEach(exLog => {
            const ex = getExerciseById(exLog.exerciseId);
            if (!ex) return;
            if (!ex.primaryMuscles.includes(muscleId) && !ex.secondaryMuscles.includes(muscleId)) return;
            const done = exLog.sets.filter(s => s.completed);
            totalVol += done.reduce((sum, s) => sum + s.reps * s.weight, 0);
          });
          byMuscleAndDate[muscleId][dateKey] = (byMuscleAndDate[muscleId][dateKey] || 0) + totalVol;
        });
    });

    const sortedDates = [...allDates].sort();
    return sortedDates.map(date => {
      const point: Record<string, string | number> = { date };
      compareMuscleIds.forEach(id => { point[id] = byMuscleAndDate[id][date] ?? 0; });
      return point;
    });
  }, [completedSessions, compareMuscleIds, getExerciseById, dateLocale]);

  const metricLabel: Record<MetricMode, string> = {
    maxWeight: t.stats.maxWeightFull,
    totalVolume: t.stats.totalVolumeFull,
    totalReps: t.stats.totalRepsFull,
  };

  function addCompareExercise(id: string) {
    if (!compareExerciseIds.includes(id) && compareExerciseIds.length < 4) {
      setCompareExerciseIds([...compareExerciseIds, id]);
    }
  }

  function removeCompareExercise(id: string) {
    setCompareExerciseIds(compareExerciseIds.filter(e => e !== id));
  }

  function addCompareMuscle(id: MuscleGroup) {
    if (!compareMuscleIds.includes(id) && compareMuscleIds.length < 4) {
      setCompareMuscleIds([...compareMuscleIds, id]);
    }
  }

  function removeCompareMuscle(id: MuscleGroup) {
    setCompareMuscleIds(compareMuscleIds.filter(m => m !== id));
  }

  if (completedSessions.length === 0) {
    return (
      <div className="pt-2">
        <EmptyState
          icon={<BarChart2 className="h-7 w-7" />}
          title={t.stats.noData}
          description={t.stats.noDataDesc}
        />
      </div>
    );
  }

  const totalVolumeAllTime = completedSessions.reduce((sum, s) =>
    sum + s.exercises.reduce((s2, ex) =>
      s2 + ex.sets.filter(s => s.completed).reduce((s3, set) => s3 + set.reps * set.weight, 0), 0), 0
  );
  const totalSetsAllTime = completedSessions.reduce((sum, s) =>
    sum + s.exercises.reduce((s2, ex) => s2 + ex.sets.filter(s => s.completed).length, 0), 0
  );

  return (
    <div className="p-4 pb-24 space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="glass-1 p-3 border border-app text-center">
          <div className="text-[20px] font-semibold text-accent tabular-nums">{completedSessions.length}</div>
          <div className="text-[11px] text-muted mt-1">{t.stats.workouts}</div>
        </div>
        <div className="glass-1 p-3 border border-app text-center">
          <div className="text-[20px] font-semibold text-accent tabular-nums">
            {(totalVolumeAllTime / 1000).toFixed(1)}t
          </div>
          <div className="text-[11px] text-muted mt-1">{t.stats.totalVolume}</div>
        </div>
        <div className="glass-1 p-3 border border-app text-center">
          <div className="text-[20px] font-semibold text-accent tabular-nums">{totalSetsAllTime}</div>
          <div className="text-[11px] text-muted mt-1">{t.stats.totalSets}</div>
        </div>
      </div>

      {/* View mode tabs */}
      <div className="flex bg-surface-2 rounded-[12px] p-1 gap-1">
        {(['exercise', 'muscle', 'calories'] as ViewMode[]).map((mode) => {
          const icons = { exercise: <TrendingUp className="w-4 h-4" />, muscle: <Activity className="w-4 h-4" />, calories: <Flame className="w-4 h-4" /> };
          const labels = { exercise: t.stats.exercise, muscle: t.stats.muscle, calories: t.stats.calories };
          return (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={cn('flex-1 py-2 rounded-[10px] text-[13px] font-medium transition-colors flex items-center justify-center gap-1.5', viewMode === mode ? 'bg-accent text-on-accent' : 'text-secondary hover:text-primary')}
            >
              {icons[mode]} {labels[mode]}
            </button>
          );
        })}
      </div>

      {/* ── EXERCISE VIEW ─────────────────────────────────────────────────── */}
      {viewMode === 'exercise' && (
        <>
          {/* Toggle compare mode */}
          <div className="flex gap-2">
            <button
              onClick={() => setCompareMode(false)}
              className={cn('flex-1 py-1.5 rounded-[10px] text-[13px] font-medium transition-colors', !compareMode ? 'bg-surface-3 text-primary' : 'text-secondary hover:text-primary')}
            >
              {t.stats.exercise}
            </button>
            <button
              onClick={() => setCompareMode(true)}
              className={cn('flex-1 py-1.5 rounded-[10px] text-[13px] font-medium transition-colors', compareMode ? 'bg-surface-3 text-primary' : 'text-secondary hover:text-primary')}
            >
              {t.stats.compare}
            </button>
          </div>

          {/* Metric selector */}
          <div className="flex bg-surface-2 rounded-[12px] p-1 gap-1 border border-app">
            {(['maxWeight', 'totalVolume', 'totalReps'] as MetricMode[]).map(m => (
              <button
                key={m}
                onClick={() => setMetric(m)}
                className={cn('flex-1 py-1.5 rounded-[10px] text-[12px] font-medium transition-colors', metric === m ? 'bg-surface-3 text-primary' : 'text-secondary hover:text-primary')}
              >
                {m === 'maxWeight' ? t.stats.maxWeight : m === 'totalVolume' ? t.stats.volumeLabel : t.stats.repsLabel}
              </button>
            ))}
          </div>

          {!compareMode ? (
            <>
              <div>
                <label className="text-[13px] text-secondary mb-2 block">{t.stats.exercise}</label>
                <Select
                  value={effectiveExerciseId}
                  onChange={e => setSelectedExerciseId(e.target.value)}
                  options={usedExercises.map(ex => ({ value: ex.id, label: ex.name }))}
                />
              </div>

              {exerciseData.length > 0 ? (
                <div className="glass-1 p-4 border border-app">
                  <h3 className="text-[15px] font-semibold text-primary mb-4 tracking-tight">
                    {allExercises.find(e => e.id === effectiveExerciseId)?.name} — {metricLabel[metric]}
                  </h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={exerciseData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
                      <XAxis dataKey="date" tick={{ fill: chart.axis, fontSize: 11 }} />
                      <YAxis tick={{ fill: chart.axis, fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{ backgroundColor: chart.tooltipBg, border: `1px solid ${chart.tooltipBorder}`, borderRadius: '12px', boxShadow: '0 8px 24px -8px rgba(0,0,0,0.4)' }}
                        labelStyle={{ color: chart.tooltipText }}
                        labelFormatter={(_, payload) => payload?.[0]?.payload?.fullDate || ''}
                        formatter={(value) => [Number(value).toFixed(1), metricLabel[metric]]}
                      />
                      <Line type="monotone" dataKey={metric} stroke="#0A84FF" strokeWidth={2.5} dot={{ fill: '#0A84FF', r: 4 }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>

                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <div className="bg-surface-2 rounded-[10px] p-2 text-center">
                      <div className="text-accent font-semibold tabular-nums">{Math.max(...exerciseData.map(d => d.maxWeight))} kg</div>
                      <div className="text-[11px] text-muted">{t.stats.recordWeight}</div>
                    </div>
                    <div className="bg-surface-2 rounded-[10px] p-2 text-center">
                      <div className="text-accent font-semibold tabular-nums">{Math.max(...exerciseData.map(d => d.totalVolume)).toLocaleString()} kg</div>
                      <div className="text-[11px] text-muted">{t.stats.maxVolume}</div>
                    </div>
                    <div className="bg-surface-2 rounded-[10px] p-2 text-center">
                      <div className="text-accent font-semibold tabular-nums">{exerciseData.length}</div>
                      <div className="text-[11px] text-muted">{t.stats.sessions}</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="glass-1 p-6 border border-app text-center">
                  <p className="text-[13px] text-muted">{t.stats.noExerciseData}</p>
                </div>
              )}
            </>
          ) : (
            /* COMPARE MODE */
            <>
              <div className="glass-1 p-4 border border-app space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-[14px] font-semibold text-primary">{t.stats.compareMode}</h3>
                  <span className="text-[11px] text-muted">{t.stats.upTo4}</span>
                </div>

                {/* Add exercise */}
                {compareExerciseIds.length < 4 && (
                  <Select
                    value=""
                    onChange={e => { if (e.target.value) { addCompareExercise(e.target.value); e.target.value = ''; } }}
                    options={usedExercises
                      .filter(ex => !compareExerciseIds.includes(ex.id))
                      .map(ex => ({ value: ex.id, label: ex.name }))}
                    placeholder={t.stats.addExercise}
                  />
                )}

                {/* Selected exercises tags */}
                <div className="flex flex-wrap gap-2">
                  {compareExerciseIds.map((id, i) => {
                    const ex = allExercises.find(e => e.id === id);
                    return (
                      <div key={id} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium text-white" style={{ backgroundColor: LINE_PALETTE[i] + 'cc' }}>
                        <span>{ex?.name || id}</span>
                        <button onClick={() => removeCompareExercise(id)}><X className="w-3 h-3" /></button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {compareExerciseIds.length > 0 && compareData.length > 0 ? (
                <div className="glass-1 p-4 border border-app">
                  <h3 className="text-[14px] font-semibold text-primary mb-4">{metricLabel[metric]}</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={compareData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
                      <XAxis dataKey="date" tick={{ fill: chart.axis, fontSize: 11 }} />
                      <YAxis tick={{ fill: chart.axis, fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{ backgroundColor: chart.tooltipBg, border: `1px solid ${chart.tooltipBorder}`, borderRadius: '12px', boxShadow: '0 8px 24px -8px rgba(0,0,0,0.4)' }}
                        formatter={(value, name) => {
                          const ex = allExercises.find(e => e.id === name);
                          return [Number(value).toFixed(1), ex?.name || String(name)];
                        }}
                      />
                      <Legend formatter={(value) => allExercises.find(e => e.id === value)?.name || value} wrapperStyle={{ fontSize: 11 }} />
                      {compareExerciseIds.map((id, i) => (
                        <Line key={id} type="monotone" dataKey={id} stroke={LINE_PALETTE[i]} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} connectNulls />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : compareExerciseIds.length === 0 ? (
                <div className="glass-1 p-6 border border-app text-center text-[13px] text-muted">
                  {t.stats.selectExercises}
                </div>
              ) : null}
            </>
          )}
        </>
      )}

      {/* ── MUSCLE VIEW ───────────────────────────────────────────────────── */}
      {viewMode === 'muscle' && (
        <>
          {/* Toggle compare mode */}
          <div className="flex gap-2">
            <button
              onClick={() => setCompareMuscleMode(false)}
              className={cn('flex-1 py-1.5 rounded-[10px] text-[13px] font-medium transition-colors', !compareMuscleMode ? 'bg-surface-3 text-primary' : 'text-secondary hover:text-primary')}
            >
              {t.stats.muscle}
            </button>
            <button
              onClick={() => setCompareMuscleMode(true)}
              className={cn('flex-1 py-1.5 rounded-[10px] text-[13px] font-medium transition-colors', compareMuscleMode ? 'bg-surface-3 text-primary' : 'text-secondary hover:text-primary')}
            >
              {t.stats.compare}
            </button>
          </div>

          {/* Muscle frequency bar chart */}
          <div className="glass-1 p-4 border border-app">
            <h3 className="text-[15px] font-semibold text-primary mb-4 tracking-tight">{t.stats.muscleFrequency}</h3>
            {muscleFrequency.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={muscleFrequency} layout="vertical" margin={{ left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
                  <XAxis type="number" tick={{ fill: chart.axis, fontSize: 11 }} />
                  <YAxis dataKey="muscle" type="category" tick={{ fill: chart.axis, fontSize: 10 }} width={90} />
                  <Tooltip
                    contentStyle={{ backgroundColor: chart.tooltipBg, border: `1px solid ${chart.tooltipBorder}`, borderRadius: '12px', boxShadow: '0 8px 24px -8px rgba(0,0,0,0.4)' }}
                    formatter={(value) => [Number(value), t.stats.sessions]}
                  />
                  <Bar dataKey="count" fill="#0A84FF" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-[13px] text-muted text-center py-4">{t.general.noData}</p>
            )}
          </div>

          {!compareMuscleMode ? (
            <>
              <div>
                <label className="text-[13px] text-secondary mb-2 block">{t.stats.muscle}</label>
                <Select
                  value={selectedMuscle}
                  onChange={e => setSelectedMuscle(e.target.value as MuscleGroup)}
                  options={ALL_MUSCLES.map(m => ({ value: m, label: muscleLabels[m] || m }))}
                />
              </div>

              {muscleData.length > 0 ? (
                <div className="glass-1 p-4 border border-app">
                  <h3 className="text-[15px] font-semibold text-primary mb-4 tracking-tight">
                    {muscleLabels[selectedMuscle] || selectedMuscle} — {t.stats.muscleVolumePerSession}
                  </h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={muscleData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
                      <XAxis dataKey="date" tick={{ fill: chart.axis, fontSize: 11 }} />
                      <YAxis tick={{ fill: chart.axis, fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{ backgroundColor: chart.tooltipBg, border: `1px solid ${chart.tooltipBorder}`, borderRadius: '12px', boxShadow: '0 8px 24px -8px rgba(0,0,0,0.4)' }}
                        labelFormatter={(_, payload) => payload?.[0]?.payload?.fullDate || ''}
                        formatter={(value) => [`${Number(value).toFixed(0)} kg`, t.stats.volumeLabel]}
                      />
                      <Bar dataKey="totalVolume" fill={MUSCLE_COLORS[selectedMuscle] || '#0A84FF'} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <div className="bg-surface-2 rounded-[10px] p-2 text-center">
                      <div className="text-accent font-semibold tabular-nums">{Math.max(...muscleData.map(d => d.totalVolume)).toLocaleString()} kg</div>
                      <div className="text-[11px] text-muted">{t.stats.maxVolume}</div>
                    </div>
                    <div className="bg-surface-2 rounded-[10px] p-2 text-center">
                      <div className="text-accent font-semibold tabular-nums">{muscleData.length}</div>
                      <div className="text-[11px] text-muted">{t.stats.sessions}</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="glass-1 p-6 border border-app text-center">
                  <p className="text-[13px] text-muted">{t.stats.noDataForMuscle} {muscleLabels[selectedMuscle] || selectedMuscle}.</p>
                </div>
              )}
            </>
          ) : (
            /* COMPARE MUSCLES MODE */
            <>
              <div className="glass-1 p-4 border border-app space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-[14px] font-semibold text-primary">{t.stats.compareMuscleMode}</h3>
                  <span className="text-[11px] text-muted">{t.stats.upTo4}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {ALL_MUSCLES.map((m) => {
                    const isSelected = compareMuscleIds.includes(m as MuscleGroup);
                    return (
                      <button
                        key={m}
                        onClick={() => isSelected ? removeCompareMuscle(m as MuscleGroup) : addCompareMuscle(m as MuscleGroup)}
                        className={cn('flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors', isSelected ? 'text-white' : 'bg-surface-2 text-secondary border border-app')}
                        style={isSelected ? { backgroundColor: LINE_PALETTE[compareMuscleIds.indexOf(m as MuscleGroup)] + 'cc' } : {}}
                        disabled={!isSelected && compareMuscleIds.length >= 4}
                      >
                        {isSelected && <X className="w-3 h-3" />}
                        {muscleLabels[m] || m}
                      </button>
                    );
                  })}
                </div>
              </div>

              {compareMuscleIds.length > 0 && compareMuscleData.length > 0 ? (
                <div className="glass-1 p-4 border border-app">
                  <h3 className="text-[14px] font-semibold text-primary mb-4">{t.stats.muscleEvolution} — {t.stats.volumeLabel}</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={compareMuscleData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
                      <XAxis dataKey="date" tick={{ fill: chart.axis, fontSize: 11 }} />
                      <YAxis tick={{ fill: chart.axis, fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{ backgroundColor: chart.tooltipBg, border: `1px solid ${chart.tooltipBorder}`, borderRadius: '12px', boxShadow: '0 8px 24px -8px rgba(0,0,0,0.4)' }}
                        formatter={(value, name) => [`${Number(value).toFixed(0)} kg`, muscleLabels[String(name)] || String(name)]}
                      />
                      <Legend formatter={(value) => muscleLabels[value] || value} wrapperStyle={{ fontSize: 11 }} />
                      {compareMuscleIds.map((id, i) => (
                        <Line key={id} type="monotone" dataKey={id} stroke={LINE_PALETTE[i]} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} connectNulls />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : compareMuscleIds.length === 0 ? (
                <div className="glass-1 p-6 border border-app text-center text-[13px] text-muted">
                  {t.stats.selectExercises}
                </div>
              ) : null}
            </>
          )}
        </>
      )}

      {/* ── CALORIES VIEW ─────────────────────────────────────────────────── */}
      {viewMode === 'calories' && (
        <CaloriesView sessions={completedSessions} cardioSessions={cardioSessions} />
      )}
    </div>
  );
}

function CaloriesView({ sessions, cardioSessions }: { sessions: WorkoutSession[]; cardioSessions: CardioSession[] }) {
  const { t, language } = useLanguage();
  const chart = useChartColors();
  const dateLocale = language === 'es' ? es : enUS;

  const calorieData = useMemo(() => {
    const dataMap: Record<string, { date: string; fullDate: string; strength: number; cardio: number; total: number }> = {};

    sessions.forEach(s => {
      const dateKey = format(new Date(s.date), 'yyyy-MM-dd');
      if (!dataMap[dateKey]) {
        dataMap[dateKey] = { date: format(new Date(s.date), 'dd/MM', { locale: dateLocale }), fullDate: format(new Date(s.date), 'd MMM yy', { locale: dateLocale }), strength: 0, cardio: 0, total: 0 };
      }
      dataMap[dateKey].strength += s.caloriesBurned || 0;
      dataMap[dateKey].total += s.caloriesBurned || 0;
    });

    cardioSessions.forEach(s => {
      const dateKey = format(new Date(s.date), 'yyyy-MM-dd');
      if (!dataMap[dateKey]) {
        dataMap[dateKey] = { date: format(new Date(s.date), 'dd/MM', { locale: dateLocale }), fullDate: format(new Date(s.date), 'd MMM yy', { locale: dateLocale }), strength: 0, cardio: 0, total: 0 };
      }
      dataMap[dateKey].cardio += s.caloriesBurned;
      dataMap[dateKey].total += s.caloriesBurned;
    });

    return Object.values(dataMap).sort((a, b) => a.date.localeCompare(b.date));
  }, [sessions, cardioSessions, dateLocale]);

  const weeklyStats = useMemo(() => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekStrength = sessions.filter(s => new Date(s.date) >= weekAgo).reduce((sum, s) => sum + (s.caloriesBurned || 0), 0);
    const weekCardio = cardioSessions.filter(s => new Date(s.date) >= weekAgo).reduce((sum, s) => sum + s.caloriesBurned, 0);
    const weekCardioMinutes = cardioSessions.filter(s => new Date(s.date) >= weekAgo).reduce((sum, s) => sum + s.duration, 0);
    return { strength: weekStrength, cardio: weekCardio, total: weekStrength + weekCardio, cardioMinutes: weekCardioMinutes };
  }, [sessions, cardioSessions]);

  const cardioTypeNames = t.cardioTypes as Record<string, string>;
  const cardioDistribution = useMemo(() => {
    const dist: Record<string, number> = {};
    cardioSessions.forEach(s => { dist[s.cardioTypeId] = (dist[s.cardioTypeId] || 0) + s.caloriesBurned; });
    return Object.entries(dist).map(([id, calories]) => ({ name: cardioTypeNames[id] || id, calories })).sort((a, b) => b.calories - a.calories);
  }, [cardioSessions, cardioTypeNames]);

  const totalAllTime = sessions.reduce((sum, s) => sum + (s.caloriesBurned || 0), 0) +
    cardioSessions.reduce((sum, s) => sum + s.caloriesBurned, 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="glass-1 p-4 border border-app">
          <div className="flex items-center gap-2 text-[13px] text-secondary mb-1"><Flame size={16} className="text-accent" />{t.stats.thisWeek}</div>
          <div className="text-[20px] font-semibold text-accent tabular-nums">{weeklyStats.total.toLocaleString()}</div>
          <div className="text-xs text-muted">{t.stats.weeklyCalories}</div>
        </div>
        <div className="glass-1 p-4 border border-app">
          <div className="flex items-center gap-2 text-[13px] text-secondary mb-1"><Heart size={16} className="text-red-400" />{t.stats.cardioLabel}</div>
          <div className="text-2xl font-bold text-green-400">{weeklyStats.cardioMinutes}</div>
          <div className="text-xs text-muted">{t.stats.cardioMinutes}</div>
        </div>
      </div>

      <div className="glass-1 p-4 border border-app">
        <h4 className="text-sm font-semibold mb-3">{t.stats.weeklyBreakdown}</h4>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-[13px] text-secondary flex items-center gap-2"><div className="h-3 w-3 rounded-full bg-accent"></div>{t.stats.strength}</span>
            <span className="font-semibold">{weeklyStats.strength.toLocaleString()} kcal</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[13px] text-secondary flex items-center gap-2"><div className="w-3 h-3 rounded bg-green-500"></div>{t.stats.cardioLabel}</span>
            <span className="font-semibold">{weeklyStats.cardio.toLocaleString()} kcal</span>
          </div>
          <div className="h-2 bg-surface-2 rounded-full overflow-hidden flex">
            {weeklyStats.total > 0 && (
              <>
                <div className="h-full bg-accent" style={{ width: `${(weeklyStats.strength / weeklyStats.total) * 100}%` }} />
                <div className="h-full bg-green-500" style={{ width: `${(weeklyStats.cardio / weeklyStats.total) * 100}%` }} />
              </>
            )}
          </div>
        </div>
      </div>

      {calorieData.length > 0 && (
        <div className="glass-1 p-4 border border-app">
          <h3 className="text-[15px] font-semibold text-primary mb-4 tracking-tight">{t.stats.caloriesPerDay}</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={calorieData.slice(-14)}>
              <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
              <XAxis dataKey="date" tick={{ fill: chart.axis, fontSize: 11 }} />
              <YAxis tick={{ fill: chart.axis, fontSize: 11 }} />
              <Tooltip
                contentStyle={{ backgroundColor: chart.tooltipBg, border: `1px solid ${chart.tooltipBorder}`, borderRadius: '12px', boxShadow: '0 8px 24px -8px rgba(0,0,0,0.4)' }}
                labelFormatter={(_, payload) => payload?.[0]?.payload?.fullDate || ''}
                formatter={(value, name) => [`${Number(value)} kcal`, name === 'strength' ? t.stats.strength : name === 'cardio' ? t.stats.cardioLabel : 'Total']}
              />
              <Bar dataKey="strength" stackId="a" fill="#f97316" name="strength" />
              <Bar dataKey="cardio" stackId="a" fill="#22c55e" name="cardio" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {cardioDistribution.length > 0 && (
        <div className="glass-1 p-4 border border-app">
          <h3 className="text-[15px] font-semibold text-primary mb-4 tracking-tight">{t.stats.caloriesByCardioType}</h3>
          <div className="space-y-2">
            {cardioDistribution.map(item => (
              <div key={item.name} className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex justify-between text-sm mb-1">
                    <span>{item.name}</span>
                    <span className="text-green-400">{item.calories.toLocaleString()} kcal</span>
                  </div>
                  <div className="h-2 bg-surface-2 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 rounded-full" style={{ width: `${(item.calories / Math.max(...cardioDistribution.map(d => d.calories))) * 100}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-[20px] glass-1 border border-accent/30 p-4 text-center" style={{ background: 'linear-gradient(135deg, color-mix(in srgb, var(--accent) 12%, transparent), color-mix(in srgb, var(--info) 8%, transparent))' }}>
        <div className="text-[13px] text-secondary mb-1">{t.stats.allTimeTotal}</div>
        <div className="text-[28px] font-semibold text-accent tabular-nums tracking-tight">{totalAllTime.toLocaleString()}</div>
        <div className="text-[13px] text-muted">{t.stats.allTimeTotalCalories}</div>
      </div>
    </div>
  );
}
