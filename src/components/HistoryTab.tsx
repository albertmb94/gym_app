import { useState, useMemo } from 'react';
import type { WorkoutSession, CardioSession, MuscleGroup } from '../types';
import { WORKOUT_TYPE_COLORS, ALL_MUSCLES } from '../data/exercises';
import { useExercises } from '../contexts/ExercisesContext';
import { useLanguage } from '../contexts/LanguageContext';
import { format, parseISO } from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import { ChevronDown, ChevronUp, Trash2, Play, CheckCircle, Clock, Dumbbell, Flame, Filter, CalendarDays, List, Copy } from 'lucide-react';
import MonthCalendar from './MonthCalendar';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { EmptyState } from './ui/EmptyState';
import { IconButton } from './ui/IconButton';
import { Dialog } from './ui/Dialog';
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
  const { getExerciseById } = useExercises();
  const dateLocale = language === 'es' ? es : enUS;

  const [showCalendar, setShowCalendar] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [selectedMuscle, setSelectedMuscle] = useState<MuscleGroup | null>(null);
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);
void setSelectedExerciseId;

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

  if (sorted.length === 0 && cardioSessions.length === 0) {
    return (
      <EmptyState
        icon={<Dumbbell className="h-6 w-6" />}
        title={t.history.noWorkouts}
        description={t.history.noWorkoutsDesc}
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-primary">{t.nav.history}</h1>
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

      <Card padding="sm">
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            {[
              { mode: 'all' as const, label: t.history.allWorkouts },
              { mode: 'muscle' as const, label: t.history.filterByMuscle },
              { mode: 'exercise' as const, label: t.history.filterByExercise },
            ].map((item) => (
              <button
                key={item.mode}
                type="button"
                onClick={() => setFilterMode(item.mode)}
                aria-pressed={filterMode === item.mode}
                className={cn(
                  'rounded-xl px-3 py-1.5 text-sm font-medium transition-colors',
                  filterMode === item.mode
                    ? 'bg-orange-500 text-white'
                    : 'bg-surface-2 text-secondary border border-app',
                )}
              >
                {item.mode !== 'all' && <Filter className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" />}
                {item.label}
              </button>
            ))}
          </div>

          {filterMode === 'muscle' && (
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {usedMuscles.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setSelectedMuscle(m as MuscleGroup)}
                  aria-pressed={selectedMuscle === m}
                  className={cn(
                    'flex-shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors',
                    selectedMuscle === m ? 'bg-orange-500 text-white' : 'bg-surface-3 text-secondary',
                  )}
                >
                  {muscleLabels[m] || m}
                </button>
              ))}
            </div>
          )}

          {filterMode !== 'all' && (
            <p className="text-xs text-muted">{filtered.length} {filtered.length === 1 ? 'entrenamiento' : 'entrenamientos'}</p>
          )}
        </div>
      </Card>

      {filtered.length === 0 ? (
        <EmptyState
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
                <Card padding="sm">
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
                            className="rounded-full px-2 py-0.5 text-xs font-bold"
                            style={{ backgroundColor: `${typeColor}33`, color: typeColor }}
                          >
                            {typeLabel}
                          </span>
                          {session.completed
                            ? <CheckCircle className="h-4 w-4 text-emerald-500" aria-hidden="true" />
                            : <Clock className="h-4 w-4 text-amber-500" aria-hidden="true" />}
                        </div>
                        <h2 className="mt-1 font-semibold text-primary">{session.name}</h2>
                        <p className="text-sm text-secondary capitalize">
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

                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                      <span className="text-primary">
                        <span className="font-bold text-orange-300">{totalVolume.toLocaleString()}</span>
                        <span className="ml-1 text-muted">{t.history.vol}</span>
                      </span>
                      <span className="text-primary">
                        <span className="font-bold text-orange-300">{completedSets}/{totalSets}</span>
                        <span className="ml-1 text-muted">{t.history.sets}</span>
                      </span>
                      <span className="text-primary">
                        <span className="font-bold text-orange-300">{session.exercises.length}</span>
                        <span className="ml-1 text-muted">{t.history.exercises}</span>
                      </span>
                      {session.durationMinutes !== undefined && session.durationMinutes > 0 && (
                        <span className="text-primary">
                          <span className="font-bold text-orange-300">{session.durationMinutes}</span>
                          <span className="ml-1 text-muted">{t.history.min}</span>
                        </span>
                      )}
                      {session.caloriesBurned !== undefined && session.caloriesBurned > 0 && (
                        <span className="inline-flex items-center gap-1 text-primary">
                          <Flame className="h-3 w-3 text-orange-300" aria-hidden="true" />
                          <span className="font-bold text-orange-300">{session.caloriesBurned}</span>
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
                          <div key={exLog.id} className="rounded-xl bg-surface-2 p-3">
                            <div className="flex items-center gap-3">
                              <img
                                src={ex.imageUrl}
                                alt=""
                                className="h-10 w-10 flex-shrink-0 rounded-lg object-cover"
                                loading="lazy"
                                onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0.3'; }}
                              />
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-primary">{ex.name}</p>
                                <p className="text-xs text-secondary">
                                  {ex.primaryMuscles.map((m) => muscleLabels[m] || m).join(', ')} · {exVolume} kg
                                </p>
                              </div>
                            </div>
                            <div className="mt-2 grid grid-cols-3 gap-1 text-xs">
                              {exLog.sets.map((set, i) => (
                                <div
                                  key={set.id}
                                  className={cn(
                                    'flex items-center gap-1 rounded px-2 py-1',
                                    set.completed
                                      ? 'bg-emerald-500/20 text-emerald-300'
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