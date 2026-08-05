import { useState, useEffect, useRef } from 'react';
import { WorkoutSession as WorkoutSessionType, ExerciseLog, SetLog, Exercise, MuscleGroup } from '../types';
import { useExercises } from '../contexts/ExercisesContext';
import { useLanguage } from '../contexts/LanguageContext';
import { generateId } from '../lib/id';
import { Plus, Trash2, Check, ChevronDown, ChevronUp, Save, X, Search, GripVertical, Flame, Calendar, Play, Pause, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import NumericInput from './NumericInput';
import { IconButton } from './ui/IconButton';
import { Button } from './ui/Button';
import { Dialog } from './ui/Dialog';
import { Sheet } from './ui/Sheet';
import { cn } from '../utils/cn';

interface Props {
  session: WorkoutSessionType;
  onSave: (session: WorkoutSessionType) => void;
  onClose: () => void;
  onDelete?: (sessionId: string) => void;
  getSuggestedSets: (exerciseId: string, numSets: number, defaultReps: number, defaultWeight: number) => { reps: number; weight: number }[];
}

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=100&q=60';

export default function WorkoutSession({ session: initialSession, onSave, onClose, onDelete, getSuggestedSets }: Props) {
  const { allExercises } = useExercises();
  const { t, language } = useLanguage();
  const dateLocale = language === 'es' ? es : enUS;
  const muscleLabelMap = t.muscles as Record<string, string>;

  const [session, setSession] = useState<WorkoutSessionType>(initialSession);
  const [expandedExercise, setExpandedExercise] = useState<string | null>(initialSession.exercises[0]?.id || null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [exerciseSearch, setExerciseSearch] = useState('');

  // ── Editable date (log workouts for past days / fix a wrongly-dated one) ──
  const dateInputValue = (() => {
    const d = new Date(session.date);
    const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    return local.toISOString().split('T')[0];
  })();

  const handleDateChange = (value: string) => {
    if (!value) return;
    const [y, m, day] = value.split('-').map(Number);
    const orig = new Date(session.date);
    const next = new Date(y, m - 1, day, orig.getHours(), orig.getMinutes(), orig.getSeconds());
    setSession(prev => ({ ...prev, date: next.toISOString() }));
  };

  // ── Auto-save (pre-save) so a backgrounded/closed app never loses progress ──
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;
  const sessionRef = useRef(session);
  sessionRef.current = session;
  // BUG 8: a ref que indica si la vista sigue activa. Evita que un evento
  // diferido (visibilitychange / pagehide) dispare onSave tras cerrar.
  const isActiveRef = useRef(true);

  const autoSave = () => {
    if (!isActiveRef.current) return;
    const s = sessionRef.current;
    if (!s || s.exercises.length === 0) return;
    onSaveRef.current(s);
  };

  useEffect(() => {
    if (session.exercises.length === 0) return;
    const id = setTimeout(() => onSaveRef.current(sessionRef.current), 1500);
    return () => clearTimeout(id);
  }, [session]);

  useEffect(() => {
    isActiveRef.current = true;
    const onVisibility = () => { if (document.hidden) autoSave(); };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', autoSave);
    return () => {
      isActiveRef.current = false;
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', autoSave);
    };
  }, []);

  // ── Timer (timestamp-based so it survives backgrounding) ───────────────
  const [timer, setTimer] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerOriginRef = useRef<number | null>(null);

  const toggleTimer = () => {
    if (!timerRunning) {
      timerOriginRef.current = Date.now() - timer * 1000;
    }
    setTimerRunning(r => !r);
  };

  useEffect(() => {
    if (timerRunning) {
      intervalRef.current = setInterval(() => {
        if (timerOriginRef.current !== null) {
          setTimer(Math.floor((Date.now() - timerOriginRef.current) / 1000));
        }
      }, 500);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [timerRunning]);

  useEffect(() => {
    const handleVisibility = () => {
      if (!document.hidden && timerRunning && timerOriginRef.current !== null) {
        setTimer(Math.floor((Date.now() - timerOriginRef.current) / 1000));
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [timerRunning]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  // ── Drag & drop (mouse + touch) ─────────────────────────────────────────
  const dragIndexRef = useRef<number | null>(null);
  const dragOverIndexRef = useRef<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const exerciseListRef = useRef<HTMLDivElement>(null);

  const updateDragOver = (idx: number | null) => {
    dragOverIndexRef.current = idx;
    setDragOverIndex(idx);
  };

  const performDrop = (toIdx: number | null) => {
    const fromIdx = dragIndexRef.current;
    if (fromIdx === null || toIdx === null || fromIdx === toIdx) {
      dragIndexRef.current = null;
      updateDragOver(null);
      return;
    }
    setSession(prev => {
      const exercises = [...prev.exercises];
      const [moved] = exercises.splice(fromIdx, 1);
      exercises.splice(toIdx, 0, moved);
      return { ...prev, exercises };
    });
    dragIndexRef.current = null;
    updateDragOver(null);
  };

  const handleDragStart = (idx: number) => { dragIndexRef.current = idx; };
  const handleDragOver = (e: React.DragEvent, idx: number) => { e.preventDefault(); updateDragOver(idx); };
  const handleDrop = (idx: number) => { performDrop(idx); };
  const handleDragEnd = () => { dragIndexRef.current = null; updateDragOver(null); };

  const handleGripTouchStart = (e: React.TouchEvent, idx: number) => {
    e.stopPropagation();
    dragIndexRef.current = idx;
    updateDragOver(idx);

    const getIdxAtY = (clientY: number): number | null => {
      if (!exerciseListRef.current) return null;
      const cards = exerciseListRef.current.querySelectorAll<HTMLElement>('[data-exercise-idx]');
      for (const card of cards) {
        const rect = card.getBoundingClientRect();
        if (clientY >= rect.top && clientY <= rect.bottom) {
          return parseInt(card.dataset.exerciseIdx ?? '-1');
        }
      }
      return null;
    };

    const onTouchMove = (ev: TouchEvent) => {
      ev.preventDefault();
      const targetIdx = getIdxAtY(ev.touches[0].clientY);
      if (targetIdx !== null) {
        dragOverIndexRef.current = targetIdx;
        setDragOverIndex(targetIdx);
      }
    };

    const onTouchEnd = () => {
      performDrop(dragOverIndexRef.current);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
      document.removeEventListener('touchcancel', onTouchEnd);
    };

    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onTouchEnd);
    document.addEventListener('touchcancel', onTouchEnd);
  };

  // ── Set mutations ────────────────────────────────────────────────────────
  const updateSet = (exerciseId: string, setId: string, field: keyof SetLog, value: number | boolean) => {
    setSession(prev => ({
      ...prev,
      exercises: prev.exercises.map(ex =>
        ex.id === exerciseId
          ? { ...ex, sets: ex.sets.map(s => s.id === setId ? { ...s, [field]: value } : s) }
          : ex
      ),
    }));
  };

  const addSet = (exerciseId: string) => {
    const ex = session.exercises.find(e => e.id === exerciseId);
    if (!ex) return;
    const lastSet = ex.sets[ex.sets.length - 1];
    const newSet: SetLog = {
      id: generateId(),
      reps: lastSet?.reps || 8,
      weight: lastSet?.weight || 0,
      completed: false,
    };
    setSession(prev => ({
      ...prev,
      exercises: prev.exercises.map(e =>
        e.id === exerciseId ? { ...e, sets: [...e.sets, newSet] } : e
      ),
    }));
  };

  const removeSet = (exerciseId: string, setId: string) => {
    setSession(prev => ({
      ...prev,
      exercises: prev.exercises.map(ex =>
        ex.id === exerciseId ? { ...ex, sets: ex.sets.filter(s => s.id !== setId) } : ex
      ),
    }));
  };

  const removeExercise = (exerciseId: string) => {
    setSession(prev => ({
      ...prev,
      exercises: prev.exercises.filter(e => e.id !== exerciseId),
    }));
  };

  const addExercise = (exerciseId: string) => {
    const suggested = getSuggestedSets(exerciseId, 3, 8, 0);
    const newExLog: ExerciseLog = {
      id: generateId(),
      exerciseId,
      sets: suggested.map(s => ({ id: generateId(), reps: s.reps, weight: s.weight, completed: false })),
    };
    setSession(prev => ({ ...prev, exercises: [...prev.exercises, newExLog] }));
    setExpandedExercise(newExLog.id);
    setShowAddExercise(false);
    setExerciseSearch('');
  };

  // ── Finish / draft ───────────────────────────────────────────────────────
  const handleFinish = () => {
    const finished = { ...session, completed: true, durationMinutes: Math.floor(timer / 60) };
    onSave(finished);
    onClose();
  };

  const handleSaveDraft = () => {
    onSave(session);
    onClose();
  };

  // ── Stats ────────────────────────────────────────────────────────────────
  const totalVolume = session.exercises.reduce((sum, ex) =>
    sum + ex.sets.filter(s => s.completed && !s.isWarmup).reduce((s2, s) => s2 + s.reps * s.weight, 0), 0
  );
  const completedSets = session.exercises.reduce((sum, ex) => sum + ex.sets.filter(s => s.completed).length, 0);
  const totalSets = session.exercises.reduce((sum, ex) => sum + ex.sets.length, 0);

  const filteredExercises = allExercises.filter((ex: Exercise) =>
    ex.name.toLowerCase().includes(exerciseSearch.toLowerCase()) ||
    ex.primaryMuscles.some((m: MuscleGroup) => (muscleLabelMap[m] || m).toLowerCase().includes(exerciseSearch.toLowerCase()))
  );

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-canvas text-primary">
      {/* Header — glass-2 sticky */}
      <header className="glass-2 border-b border-app flex-shrink-0">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-[17px] font-semibold text-primary truncate tracking-tight">{session.name}</h2>
            <button
              onClick={() => setShowDatePicker(v => !v)}
              className="mt-0.5 inline-flex items-center gap-1 text-[12px] text-secondary hover:text-accent transition-colors"
            >
              <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="capitalize">{format(new Date(session.date), 'EEEE d MMM', { locale: dateLocale })}</span>
              <ChevronDown className={cn('h-3.5 w-3.5 transition-transform duration-200', showDatePicker && 'rotate-180')} />
            </button>
            {showDatePicker && (
              <input
                type="date"
                value={dateInputValue}
                max={new Date().toISOString().split('T')[0]}
                onChange={e => handleDateChange(e.target.value)}
                className="mt-2 block w-full max-w-[180px] rounded-[10px] border border-app bg-surface-2 px-2.5 py-1.5 text-[13px] text-primary focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              />
            )}
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              onClick={toggleTimer}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-mono text-[14px] font-semibold tabular-nums',
                'transition-all duration-200 ease-apple',
                'active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                timerRunning
                  ? 'bg-accent text-on-accent shadow-[0_4px_14px_-4px_color-mix(in_srgb,var(--accent)_60%,transparent)]'
                  : 'bg-surface-2 text-primary border border-app',
              )}
              aria-label={timerRunning ? t.workout.stopTimer : t.workout.startTimer}
            >
              {timerRunning ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
              {formatTime(timer)}
            </button>
            {onDelete && (
              <IconButton
                label={language === 'es' ? 'Eliminar entrenamiento' : 'Delete workout'}
                icon={<Trash2 className="h-4 w-4" aria-hidden="true" />}
                variant="ghost"
                size="sm"
                onClick={() => setConfirmDelete(true)}
              />
            )}
            <IconButton
              label={t.general.close}
              icon={<X className="h-5 w-5" aria-hidden="true" />}
              variant="ghost"
              size="sm"
              onClick={onClose}
            />
          </div>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-px border-t border-app bg-app">
          {[
            { value: `${completedSets}/${totalSets}`, label: t.history.sets, tint: 'text-accent' },
            { value: `${totalVolume.toLocaleString()} kg`, label: t.stats.volumeLabel, tint: 'text-accent' },
            { value: session.exercises.length, label: t.history.exercises, tint: 'text-primary' },
          ].map((stat) => (
            <div key={stat.label} className="bg-canvas px-4 py-2.5 text-center">
              <div className={cn('text-[15px] font-semibold tabular-nums tracking-tight', stat.tint)}>{stat.value}</div>
              <div className="text-[11px] text-muted mt-0.5">{stat.label}</div>
            </div>
          ))}
        </div>
      </header>

      {/* Exercise list */}
      <div ref={exerciseListRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {session.exercises.map((exLog, idx) => {
          const exercise = allExercises.find((e: Exercise) => e.id === exLog.exerciseId);
          if (!exercise) return null;
          const isExpanded = expandedExercise === exLog.id;
          const completedCount = exLog.sets.filter(s => s.completed).length;
          const isDragOver = dragOverIndex === idx;

          return (
            <article
              key={exLog.id}
              data-exercise-idx={idx}
              draggable
              onDragStart={() => handleDragStart(idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDrop={() => handleDrop(idx)}
              onDragEnd={handleDragEnd}
              className={cn(
                'relative glass-1 rounded-[18px] overflow-hidden',
                'transition-all duration-200 ease-apple',
                isDragOver && 'ring-2 ring-accent scale-[1.01]',
              )}
            >
              {/* Exercise header */}
              <div className="flex items-center gap-2 p-3">
                <button
                  type="button"
                  onTouchStart={(e) => handleGripTouchStart(e, idx)}
                  aria-label={t.general.moreOptions}
                  className="grid h-7 w-7 flex-shrink-0 cursor-grab place-items-center rounded-md text-muted active:cursor-grabbing hover:bg-surface-2 hover:text-secondary select-none touch-none"
                >
                  <GripVertical className="h-4 w-4" aria-hidden="true" />
                </button>

                <button
                  type="button"
                  onClick={() => setExpandedExercise(isExpanded ? null : exLog.id)}
                  className="flex flex-1 min-w-0 items-center gap-3 text-left"
                >
                  <img
                    src={exercise.imageUrl}
                    alt={exercise.name}
                    className="h-11 w-11 rounded-[10px] object-cover flex-shrink-0"
                    onError={e => { (e.target as HTMLImageElement).src = FALLBACK_IMAGE; }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-[14px] font-semibold text-primary truncate">{exercise.name}</div>
                    <div className="text-[11px] text-secondary truncate">
                      {exercise.primaryMuscles.map((m: MuscleGroup) => muscleLabelMap[m] || m).join(', ')}
                    </div>
                    <div className="mt-0.5 text-[12px] font-medium text-accent">
                      {completedCount}/{exLog.sets.length} {t.history.sets}
                    </div>
                  </div>
                </button>

                <div className="flex flex-shrink-0 items-center gap-1">
                  <IconButton
                    label={t.general.delete}
                    icon={<Trash2 className="h-3.5 w-3.5" aria-hidden="true" />}
                    variant="ghost"
                    size="sm"
                    onClick={() => removeExercise(exLog.id)}
                  />
                  <IconButton
                    label={isExpanded ? t.general.close : t.general.moreOptions}
                    icon={isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    variant="ghost"
                    size="sm"
                    onClick={() => setExpandedExercise(isExpanded ? null : exLog.id)}
                    aria-expanded={isExpanded}
                  />
                </div>
              </div>

              {/* Sets (expanded) */}
              {isExpanded && (
                <div className="border-t border-app p-3 space-y-2">
                  {/* Column header */}
                  <div className="grid grid-cols-[1.5rem_2rem_1fr_1fr_2.5rem_1.75rem] items-center gap-1.5 px-1 text-[10px] font-semibold uppercase tracking-wider text-muted">
                    <span className="text-center">#</span>
                    <span className="text-center" title={language === 'es' ? 'Calentamiento' : 'Warm-up'}>W</span>
                    <span className="text-center">{language === 'es' ? 'Peso' : 'Weight'}</span>
                    <span className="text-center">Reps</span>
                    <span className="text-center">✓</span>
                    <span></span>
                  </div>

                  {exLog.sets.map((set) => {
                    const isWarmup = !!set.isWarmup;
                    const workIndex = exLog.sets.filter(s => !s.isWarmup).indexOf(set);
                    return (
                      <div
                        key={set.id}
                        className={cn(
                          'grid grid-cols-[1.5rem_2rem_1fr_1fr_2.5rem_1.75rem] items-center gap-1.5 rounded-[10px] px-1.5 py-1.5',
                          'transition-colors duration-150',
                          set.completed
                            ? isWarmup
                              ? 'bg-[color:var(--warning)]/12'
                              : 'bg-[color:var(--success)]/12'
                            : 'bg-surface-2',
                        )}
                      >
                        {/* Set number */}
                        <span className={cn(
                          'text-center text-[12px] font-bold',
                          isWarmup ? 'text-[color:var(--warning)]' : 'text-muted',
                        )}>
                          {isWarmup ? 'W' : (workIndex + 1)}
                        </span>

                        {/* Warm-up toggle */}
                        <button
                          type="button"
                          onClick={() => updateSet(exLog.id, set.id, 'isWarmup', !isWarmup)}
                          className={cn(
                            'mx-auto grid h-6 w-6 place-items-center rounded-md transition-all',
                            isWarmup
                              ? 'bg-[color:var(--warning)]/25 text-[color:var(--warning)]'
                              : 'text-muted hover:text-[color:var(--warning)]',
                          )}
                          title={isWarmup
                            ? (language === 'es' ? 'Quitar calentamiento' : 'Remove warm-up')
                            : (language === 'es' ? 'Marcar como calentamiento' : 'Mark as warm-up')}
                          aria-pressed={isWarmup}
                        >
                          <Flame className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>

                        {/* Weight */}
                        <NumericInput
                          value={set.weight}
                          onChange={(v) => updateSet(exLog.id, set.id, 'weight', v)}
                          decimals
                          min={0}
                          step={0.5}
                          placeholder="0"
                          fallbackOnEmpty={0}
                          className={cn(
                            'w-full text-center rounded-[10px] border py-1.5 text-[14px] font-medium tabular-nums',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                            isWarmup
                              ? 'bg-[color:var(--warning)]/10 border-[color:var(--warning)]/30 text-[color:var(--warning)]'
                              : 'bg-canvas border-app text-primary focus-visible:border-accent',
                          )}
                        />

                        {/* Reps */}
                        <NumericInput
                          value={set.reps}
                          onChange={(v) => updateSet(exLog.id, set.id, 'reps', v)}
                          min={0}
                          placeholder="8"
                          fallbackOnEmpty={8}
                          className={cn(
                            'w-full text-center rounded-[10px] border py-1.5 text-[14px] font-medium tabular-nums',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                            isWarmup
                              ? 'bg-[color:var(--warning)]/10 border-[color:var(--warning)]/30 text-[color:var(--warning)]'
                              : 'bg-canvas border-app text-primary focus-visible:border-accent',
                          )}
                        />

                        {/* Complete */}
                        <button
                          type="button"
                          onClick={() => updateSet(exLog.id, set.id, 'completed', !set.completed)}
                          className={cn(
                            'mx-auto grid h-7 w-7 place-items-center rounded-full transition-all duration-150 ease-apple',
                            'active:scale-90',
                            set.completed
                              ? isWarmup
                                ? 'bg-[color:var(--warning)] text-white'
                                : 'bg-[color:var(--success)] text-white'
                              : 'border-2 border-app text-muted hover:border-accent hover:text-accent',
                          )}
                          aria-pressed={set.completed}
                          aria-label={t.general.confirm}
                        >
                          {set.completed ? <Check className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5 opacity-30" />}
                        </button>

                        {/* Remove */}
                        <button
                          type="button"
                          onClick={() => removeSet(exLog.id, set.id)}
                          aria-label={t.general.delete}
                          className="mx-auto grid h-7 w-7 place-items-center rounded-md text-muted hover:bg-[color:var(--danger)]/15 hover:text-[color:var(--danger)] transition-colors"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    );
                  })}

                  {/* Warmup legend */}
                  {exLog.sets.some(s => s.isWarmup) && (
                    <div className="flex items-center gap-1.5 px-1 pt-1 text-[11px] text-[color:var(--warning)]">
                      <Flame className="h-3 w-3" aria-hidden="true" />
                      {language === 'es'
                        ? 'Las series W (calentamiento) no cuentan para la progresión de peso'
                        : 'W (warm-up) sets are excluded from weight progression'}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => addSet(exLog.id)}
                    className={cn(
                      'flex w-full items-center justify-center gap-1.5 rounded-[12px] border border-dashed py-2 text-[13px] font-medium',
                      'border-app text-secondary hover:border-accent hover:text-accent hover:bg-accent-soft/40',
                      'transition-colors duration-150',
                    )}
                  >
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    {t.workout.addSet}
                  </button>
                </div>
              )}
            </article>
          );
        })}

        <button
          type="button"
          onClick={() => setShowAddExercise(true)}
          className={cn(
            'flex w-full items-center justify-center gap-2 rounded-[18px] border-2 border-dashed py-3.5 text-[14px] font-semibold',
            'border-app text-secondary hover:border-accent hover:text-accent hover:bg-accent-soft/40',
            'transition-colors duration-150',
          )}
        >
          <Plus className="h-5 w-5" aria-hidden="true" />
          {t.workout.addExercise}
        </button>
      </div>

      {/* Bottom action bar — glass-2 sticky */}
      <footer className="glass-2 border-t border-app flex-shrink-0 safe-bottom">
        <div className="flex gap-2.5 px-4 py-3">
          <Button
            variant="secondary"
            fullWidth
            onClick={handleSaveDraft}
            iconLeft={<Save className="h-4 w-4" />}
          >
            {language === 'es' ? 'Borrador' : 'Draft'}
          </Button>
          <Button
            variant="primary"
            fullWidth
            onClick={handleFinish}
            iconLeft={<Check className="h-4 w-4" />}
          >
            {t.workout.finish}
          </Button>
        </div>
      </footer>

      {/* Add Exercise — bottom sheet */}
      <Sheet
        open={showAddExercise}
        onClose={() => { setShowAddExercise(false); setExerciseSearch(''); }}
        title={t.workout.addExercise}
      >
        <div className="relative mb-3">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
            aria-hidden="true"
          />
          <input
            type="text"
            value={exerciseSearch}
            onChange={e => setExerciseSearch(e.target.value)}
            placeholder={t.workout.searchExercises}
            className="block w-full rounded-[12px] border border-app bg-surface-2 py-2.5 pl-10 pr-3 text-[14px] text-primary placeholder:text-muted focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          />
        </div>
        <ul className="space-y-1.5">
          {filteredExercises.length === 0 && (
            <li className="py-8 text-center text-[13px] text-muted">{t.workout.noExercisesFound}</li>
          )}
          {filteredExercises.map((ex: Exercise) => {
            const alreadyAdded = session.exercises.some(e => e.exerciseId === ex.id);
            return (
              <li key={ex.id}>
                <button
                  type="button"
                  onClick={() => !alreadyAdded && addExercise(ex.id)}
                  disabled={alreadyAdded}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-[14px] border p-3 text-left',
                    'transition-colors duration-150',
                    alreadyAdded
                      ? 'cursor-not-allowed border-app bg-surface-2 opacity-50'
                      : 'border-app bg-surface-2 hover:border-accent hover:bg-surface-3 active:scale-[0.99]',
                  )}
                >
                  <img
                    src={ex.imageUrl}
                    alt={ex.name}
                    className="h-11 w-11 flex-shrink-0 rounded-[10px] object-cover"
                    onError={e => { (e.target as HTMLImageElement).src = FALLBACK_IMAGE; }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-[14px] font-medium text-primary">{ex.name}</div>
                    <div className="text-[11px] text-accent">
                      {ex.primaryMuscles.map((m: MuscleGroup) => muscleLabelMap[m] || m).join(', ')}
                    </div>
                    {ex.secondaryMuscles.length > 0 && (
                      <div className="mt-0.5 text-[10px] text-muted truncate">
                        {ex.secondaryMuscles.map((m: MuscleGroup) => muscleLabelMap[m] || m).join(' · ')}
                      </div>
                    )}
                  </div>
                  {alreadyAdded && (
                    <span className="text-[11px] text-muted">{language === 'es' ? 'Añadido' : 'Added'}</span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </Sheet>

      {/* Delete confirmation */}
      <Dialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title={language === 'es' ? 'Eliminar entrenamiento' : 'Delete workout'}
        description={language === 'es'
          ? '¿Seguro que quieres eliminar este entrenamiento? No se puede deshacer.'
          : 'Are you sure you want to delete this workout? This cannot be undone.'}
      >
        <div className="mt-2 flex gap-2">
          <Button variant="ghost" fullWidth onClick={() => setConfirmDelete(false)}>
            {t.general.cancel}
          </Button>
          <Button
            variant="danger"
            fullWidth
            onClick={() => { onDelete?.(session.id); setConfirmDelete(false); onClose(); }}
            iconLeft={<Trash2 className="h-4 w-4" />}
          >
            {t.general.delete}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
