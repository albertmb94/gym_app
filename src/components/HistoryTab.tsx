import { useState, useMemo } from 'react';
import type { WorkoutSession, CardioSession, MuscleGroup } from '../types';
import { WORKOUT_TYPE_COLORS, ALL_MUSCLES } from '../data/exercises';
import { useExercises } from '../contexts/ExercisesContext';
import { useLanguage } from '../contexts/LanguageContext';
import { format, parseISO } from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import { ChevronDown, ChevronUp, Trash2, Play, CheckCircle, Clock, Dumbbell, Flame, Filter, CalendarDays, List, Copy, Search, X } from 'lucide-react';
import MonthCalendar from './MonthCalendar';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { EmptyState } from './ui/EmptyState';
import { IconButton } from './ui/IconButton';
import { Dialog } from './ui/Dialog';
import { Chip } from './ui/Chip';
import { SegmentedControl } from './ui/SegmentedControl';
import { sessionVolume, completedSetCount } from '../utils/metrics';
import { cn } from '../utils/cn';

interface Props {
  sessions: WorkoutSession[];
  cardioSessions?: CardioSession[];
  onDelete: (id: string) => void;
  onContinue: (session: WorkoutSession) => void;
  onDuplicate?: (id: string) => void;
}

type FilterMode = 'all' | 'muscle' | 'exercise';

export default function HistoryTab({ sessions, cardioSessions = [], onDelete, onContinue, onDuplicate }: Props) {
  const { t, language } = useLanguage();
  const { allExercises, getExerciseById } = useExercises();
  const dateLocale = language === 'es' ? es : enUS;

  const [showCalendar, setShowCalendar] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [selectedMuscle, setSelectedMuscle] = useState<MuscleGroup | null>(null);
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);
  const [exerciseSearch, setExerciseSearch] = useState('');

  const sorted = useMemo(
    () => [...sessions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [sessions],
  );

  const usedMuscles = useMemo(() => {
    const used = new Set<string>();
    sorted.forEach((s) => {
      s.exercises.forEach((exLog) => {
        const ex = getExerciseById(exLog.exerciseId);
        if (!ex) return;
        ex.primaryMuscles.forEach((m) => used.add(m));
      });
    });
    return ALL_MUSCLES.filter((m) => used.has(m));
  }, [sorted, getExerciseById]);

  // Ejercicios que aparecen en el historial (los que el usuario realmente ha hecho)
  const usedExercises = useMemo(() => {
    const used = new Set<string>();
    sorted.forEach((s) => {
      s.exercises.forEach((exLog) => used.add(exLog.exerciseId));
    });
    return allExercises
      .filter((ex) => used.has(ex.id))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [sorted, allExercises]);

  const filteredExercises = useMemo(() => {
    const q = exerciseSearch.trim().toLowerCase();
    if (!q) return usedExercises;
    return usedExercises.filter((ex) => ex.name.toLowerCase().includes(q));
  }, [usedExercises, exerciseSearch]);

  const filtered = useMemo(() => {
    if (filterMode === 'muscle' && selectedMuscle) {
      return sorted.filter((s) =>
        s.exercises.some((exLog) => {
          const ex = getExerciseById(exLog.exerciseId);
          return ex && (ex.primaryMuscles.includes(selectedMuscle) || ex.secondaryMuscles.includes(selectedMuscle));
        }),
      );
    }
    if (filterMode === 'exercise' && selectedExerciseId) {
      return sorted.filter((s) => s.exercises.some((e) => e.exerciseId === selectedExerciseId));
    }
    return sorted;
  }, [sorted, filterMode, selectedMuscle, selectedExerciseId, getExerciseById]);

  const muscleLabels = t.muscles as Record<string, string>;
  const hasNoData = sorted.length === 0 && cardioSessions.length === 0;

  // Resetea selección si cambia el modo (evita selección inválida)
  function handleFilterModeChange(mode: FilterMode) {
    setFilterMode(mode);
    if (mode === 'all') {
      setSelectedMuscle(null);
      setSelectedExerciseId(null);
    } else if (mode === 'muscle') {
      setSelectedExerciseId(null);
    } else if (mode === 'exercise') {
      setSelectedMuscle(null);
    }
  }

  if (hasNoData) {
    return (
      <div className="pt-2">
        <EmptyState
          icon={<Dumbbell className="h-6 w-6" />}
          title={t.history.noWorkouts}
          description={t.history.noWorkoutsDesc}
        />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-[24px] font-semibold text-primary tracking-tight">{t.nav.history}</h1>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowCalendar((v) => !v)}
          iconLeft={showCalendar ? <List className="h-4 w-4" /> : <CalendarDays className="h-4 w-4" />}
        >
          {showCalendar
            ? (language === 'es' ? 'Ocultar calendario' : 'Hide calendar')
            : (language === 'es' ? 'Ver calendario' : 'View calendar')}
        </Button>
      </div>

      {showCalendar && <MonthCalendar sessions={sessions} cardioSessions={cardioSessions} />}

      <Card level="glass1" padding="sm">
        <div className="space-y-3">
          <SegmentedControl<FilterMode>
            ariaLabel={t.nav.primary}
            value={filterMode}
            onChange={handleFilterModeChange}
            options={[
              { value: 'all', label: t.history.allWorkouts },
              { value: 'muscle', label: t.history.filterByMuscle, iconLeft: <Filter className="h-3.5 w-3.5" /> },
              { value: 'exercise', label: t.history.filterByExercise, iconLeft: <Filter className="h-3.5 w-3.5" /> },
            ]}
          />

          {filterMode === 'muscle' && (
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
              {usedMuscles.length === 0 ? (
                <p className="text-[12px] text-muted py-2">{t.general.noData}</p>
              ) : (
                usedMuscles.map((m) => (
                  <Chip
                    key={m}
                    label={muscleLabels[m] || m}
                    selected={selectedMuscle === m}
                    onClick={() => setSelectedMuscle(selectedMuscle === m ? null : (m as MuscleGroup))}
                    size="sm"
                  />
                ))
              )}
            </div>
          )}

          {filterMode === 'exercise' && (
            <div className="space-y-2">
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
                  aria-hidden="true"
                />
                <input
                  type="text"
                  value={exerciseSearch}
                  onChange={(e) => setExerciseSearch(e.target.value)}
                  placeholder={t.workout.searchExercises}
                  className="block w-full rounded-[12px] border border-app bg-surface-2 py-2.5 pl-9 pr-9 text-[14px] text-primary placeholder:text-muted focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                />
                {exerciseSearch && (
                  <button
                    type="button"
                    onClick={() => setExerciseSearch('')}
                    aria-label={t.general.cancel}
                    className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full text-muted hover:bg-surface-3 hover:text-primary"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              {usedExercises.length === 0 ? (
                <p className="text-[12px] text-muted py-2">{t.general.noData}</p>
              ) : (
                <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
                  {filteredExercises.map((ex) => (
                    <Chip
                      key={ex.id}
                      label={ex.name}
                      selected={selectedExerciseId === ex.id}
                      onClick={() => setSelectedExerciseId(selectedExerciseId === ex.id ? null : ex.id)}
                      size="sm"
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {filterMode !== 'all' && (
            <p className="text-[12px] text-muted">
              {filtered.length} {filtered.length === 1 ? (language === 'es' ? 'entrenamiento' : 'workout') : (language === 'es' ? 'entrenamientos' : 'workouts')}
            </p>
          )}
        </div>
      </Card>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Filter className="h-6 w-6" />}
          title={t.history.noResultsFilter}
          description={language === 'es' ? 'Prueba otro filtro o limpia los seleccionados.' : 'Try another filter or clear selection.'}
        />
      ) : (
        <ul className="space-y-2">
          {filtered.map((session) => {
            const isExpanded = expandedId === session.id;
            const totalVolume = sessionVolume(session, { excludeWarmup: true });
            const completedSets = completedSetCount(session, { excludeWarmup: true });
            const totalSets = session.exercises.reduce((sum, ex) => sum + ex.sets.length, 0);
            const typeColor = WORKOUT_TYPE_COLORS[session.type] || 'var(--text-muted)';
            const typeLabel = (t.workoutTypes as Record<string, string>)[session.type] || session.type;

            return (
              <li key={session.id}>
                <Card level="glass1" padding="sm">
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : session.id)}
                    aria-expanded={isExpanded}
                    className="block w-full text-left"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className="rounded-full px-2 py-0.5 text-[11px] font-semibold tracking-wide"
                            style={{ backgroundColor: `${typeColor}22`, color: typeColor }}
                          >
                            {typeLabel}
                          </span>
                          {session.completed
                            ? <CheckCircle className="h-4 w-4 text-[color:var(--success)]" aria-hidden="true" />
                            : <Clock className="h-4 w-4 text-[color:var(--warning)]" aria-hidden="true" />}
                        </div>
                        <h2 className="mt-1.5 text-[15px] font-semibold text-primary">{session.name}</h2>
                        <p className="text-[12px] text-secondary capitalize">
                          {format(parseISO(session.date), "EEEE, d 'de' MMMM yyyy", { locale: dateLocale })}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        {!session.completed && (
                          <IconButton
                            label={t.general.continue}
                            icon={<Play className="h-5 w-5" />}
                            variant="ghost"
                            size="md"
                            onClick={(e) => {
                              e.stopPropagation();
                              onContinue(session);
                            }}
                          />
                        )}
                        {isExpanded
                          ? <ChevronUp className="h-5 w-5 text-muted" aria-hidden="true" />
                          : <ChevronDown className="h-5 w-5 text-muted" aria-hidden="true" />}
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[13px]">
                      <span className="text-primary">
                        <span className="font-bold text-accent">{totalVolume.toLocaleString()}</span>
                        <span className="ml-1 text-muted">{t.history.vol}</span>
                      </span>
                      <span className="text-primary">
                        <span className="font-bold text-accent">{completedSets}/{totalSets}</span>
                        <span className="ml-1 text-muted">{t.history.sets}</span>
                      </span>
                      <span className="text-primary">
                        <span className="font-bold text-accent">{session.exercises.length}</span>
                        <span className="ml-1 text-muted">{t.history.exercises}</span>
                      </span>
                      {session.durationMinutes !== undefined && session.durationMinutes > 0 && (
                        <span className="text-primary">
                          <span className="font-bold text-accent">{session.durationMinutes}</span>
                          <span className="ml-1 text-muted">{t.history.min}</span>
                        </span>
                      )}
                      {session.caloriesBurned !== undefined && session.caloriesBurned > 0 && (
                        <span className="inline-flex items-center gap-1 text-primary">
                          <Flame className="h-3 w-3 text-accent" aria-hidden="true" />
                          <span className="font-bold text-accent">{session.caloriesBurned}</span>
                          <span className="text-muted">kcal</span>
                        </span>
                      )}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="mt-3 space-y-3 border-t border-app pt-3">
                      {session.exercises.map((exLog) => {
                        const ex = getExerciseById(exLog.exerciseId);
                        if (!ex) return null;
                        const exVolume = exLog.sets
                          .filter((s) => s.completed && !s.isWarmup)
                          .reduce((s, set) => s + set.reps * set.weight, 0);
                        return (
                          <div key={exLog.id} className="rounded-[14px] bg-surface-2 p-3">
                            <div className="flex items-center gap-3">
                              <img
                                src={ex.imageUrl}
                                alt=""
                                className="h-10 w-10 flex-shrink-0 rounded-[10px] object-cover"
                                loading="lazy"
                                onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0.3'; }}
                              />
                              <div className="min-w-0 flex-1">
                                <p className="text-[14px] font-medium text-primary">{ex.name}</p>
                                <p className="text-[12px] text-secondary">
                                  {ex.primaryMuscles.map((m) => muscleLabels[m] || m).join(', ')} · {exVolume} kg
                                </p>
                              </div>
                            </div>
                            <div className="mt-2 grid grid-cols-3 gap-1 text-[12px]">
                              {exLog.sets.map((set, i) => (
                                <div
                                  key={set.id}
                                  className={cn(
                                    'flex items-center gap-1 rounded-md px-2 py-1',
                                    set.completed
                                      ? 'bg-[color:var(--success)]/15 text-[color:var(--success)]'
                                      : 'bg-surface-3 text-muted',
                                  )}
                                >
                                  <span className="font-bold">{i + 1}.</span>
                                  <span>{set.weight}kg × {set.reps}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}

                      <div className="flex flex-wrap gap-2">
                        {!session.completed && (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => onContinue(session)}
                            iconLeft={<Play className="h-4 w-4" />}
                          >
                            {t.general.continue}
                          </Button>
                        )}
                        {onDuplicate && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => onDuplicate(session.id)}
                            iconLeft={<Copy className="h-4 w-4" />}
                          >
                            {t.history.duplicate}
                          </Button>
                        )}
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => setConfirmDelete(session.id)}
                          iconLeft={<Trash2 className="h-4 w-4" />}
                        >
                          {t.general.delete}
                        </Button>
                      </div>
                    </div>
                  )}
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      <Dialog
        open={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        title={language === 'es' ? 'Eliminar entrenamiento' : 'Delete workout'}
        description={t.workout.confirmDelete}
      >
        <div className="flex gap-2">
          <Button variant="ghost" fullWidth onClick={() => setConfirmDelete(null)}>
            {t.general.cancel}
          </Button>
          <Button
            variant="danger"
            fullWidth
            onClick={() => {
              if (confirmDelete) {
                onDelete(confirmDelete);
                setConfirmDelete(null);
                setExpandedId(null);
              }
            }}
          >
            {t.general.delete}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
