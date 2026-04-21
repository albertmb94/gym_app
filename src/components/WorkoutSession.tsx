import { useState, useEffect, useRef } from 'react';
import { WorkoutSession as WorkoutSessionType, ExerciseLog, SetLog, Exercise, MuscleGroup } from '../types';
import { useExercises } from '../contexts/ExercisesContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Plus, Trash2, Check, ChevronDown, ChevronUp, Timer, Save, X, Search, GripVertical, Flame } from 'lucide-react';
import { format } from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import NumericInput from './NumericInput';

interface Props {
  session: WorkoutSessionType;
  onSave: (session: WorkoutSessionType) => void;
  onClose: () => void;
  getSuggestedSets: (exerciseId: string, numSets: number, defaultReps: number, defaultWeight: number) => { reps: number; weight: number }[];
}

function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export default function WorkoutSession({ session: initialSession, onSave, onClose, getSuggestedSets }: Props) {
  const { allExercises } = useExercises();
  const { t, language } = useLanguage();
  const dateLocale = language === 'es' ? es : enUS;
  const muscleLabelMap = t.muscles as Record<string, string>;

  const [session, setSession] = useState<WorkoutSessionType>(initialSession);
  const [expandedExercise, setExpandedExercise] = useState<string | null>(initialSession.exercises[0]?.id || null);

  // ── Timer (timestamp-based so it survives backgrounding) ───────────────
  const [timer, setTimer] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerOriginRef = useRef<number | null>(null); // Date.now() when timer was at 0

  const toggleTimer = () => {
    if (!timerRunning) {
      // Record when "0 seconds" was, accounting for already elapsed time
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
      }, 500); // 500ms tick to be more responsive
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [timerRunning]);

  // Recover correct timer value when app returns from background
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

  // ── Exercise search / add ───────────────────────────────────────────────
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [exerciseSearch, setExerciseSearch] = useState('');

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

  // ── Mouse / HTML5 DnD (desktop) ──────────────────────────────────────────
  const handleDragStart = (idx: number) => { dragIndexRef.current = idx; };
  const handleDragOver = (e: React.DragEvent, idx: number) => { e.preventDefault(); updateDragOver(idx); };
  const handleDrop = (idx: number) => { performDrop(idx); };
  const handleDragEnd = () => { dragIndexRef.current = null; updateDragOver(null); };

  // ── Touch DnD (mobile) ───────────────────────────────────────────────────
  const handleGripTouchStart = (e: React.TouchEvent, idx: number) => {
    e.stopPropagation();
    dragIndexRef.current = idx;
    updateDragOver(idx);

    const getIdxAtY = (clientY: number): number | null => {
      if (!exerciseListRef.current) return null;
      const cards = exerciseListRef.current.querySelectorAll<HTMLElement>('[data-drag-idx]');
      for (const card of cards) {
        const rect = card.getBoundingClientRect();
        if (clientY >= rect.top && clientY <= rect.bottom) {
          return parseInt(card.dataset.dragIdx ?? '-1');
        }
      }
      return null;
    };

    const onTouchMove = (ev: TouchEvent) => {
      ev.preventDefault(); // stop page scroll while dragging
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
    };

    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onTouchEnd);
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
    <div className="fixed inset-0 bg-gray-900 z-50 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div>
          <h2 className="text-white font-bold text-lg">{session.name}</h2>
          <p className="text-gray-400 text-sm">{format(new Date(session.date), 'EEEE d MMM', { locale: dateLocale })}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={toggleTimer}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-mono font-bold transition-colors ${timerRunning ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-300'}`}
          >
            <Timer className="w-4 h-4" />
            {formatTime(timer)}
          </button>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="bg-gray-800/50 border-b border-gray-700 px-4 py-2 flex gap-6 flex-shrink-0">
        <div className="text-center">
          <div className="text-orange-400 font-bold">{completedSets}/{totalSets}</div>
          <div className="text-gray-500 text-xs">{t.history.sets}</div>
        </div>
        <div className="text-center">
          <div className="text-orange-400 font-bold">{totalVolume.toLocaleString()} kg</div>
          <div className="text-gray-500 text-xs">{t.stats.volumeLabel}</div>
        </div>
        <div className="text-center">
          <div className="text-orange-400 font-bold">{session.exercises.length}</div>
          <div className="text-gray-500 text-xs">{t.history.exercises}</div>
        </div>
      </div>

      {/* Exercise list */}
      <div ref={exerciseListRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {session.exercises.map((exLog, idx) => {
          const exercise = allExercises.find((e: Exercise) => e.id === exLog.exerciseId);
          if (!exercise) return null;
          const isExpanded = expandedExercise === exLog.id;
          const completedCount = exLog.sets.filter(s => s.completed).length;
          const isDragOver = dragOverIndex === idx;

          return (
            <div
              key={exLog.id}
              data-drag-idx={idx}
              draggable
              onDragStart={() => handleDragStart(idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDrop={() => handleDrop(idx)}
              onDragEnd={handleDragEnd}
              className={`bg-gray-800 rounded-xl border overflow-hidden transition-all ${isDragOver ? 'border-orange-500 shadow-lg shadow-orange-900/30 scale-[1.01]' : 'border-gray-700'}`}
            >
              {/* Exercise header */}
              <div className="flex items-center p-3 gap-2">
                {/* Drag handle — works for both mouse (cursor-grab) and touch (onTouchStart) */}
                <div
                  className="text-gray-600 hover:text-gray-400 cursor-grab active:cursor-grabbing flex-shrink-0 px-1 select-none"
                  onTouchStart={(e) => handleGripTouchStart(e, idx)}
                >
                  <GripVertical className="w-4 h-4" />
                </div>

                <div
                  className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                  onClick={() => setExpandedExercise(isExpanded ? null : exLog.id)}
                >
                  <img
                    src={exercise.imageUrl}
                    alt={exercise.name}
                    className="w-11 h-11 rounded-lg object-cover flex-shrink-0"
                    onError={e => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=100&q=60'; }}
                  />
                  <div className="min-w-0">
                    <div className="font-semibold text-white text-sm truncate">{exercise.name}</div>
                    <div className="text-xs text-gray-400">
                      {exercise.primaryMuscles.map((m: MuscleGroup) => muscleLabelMap[m] || m).join(', ')}
                    </div>
                    <div className="text-xs text-orange-400 font-medium">{completedCount}/{exLog.sets.length} {t.history.sets}</div>
                  </div>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={e => { e.stopPropagation(); removeExercise(exLog.id); }}
                    className="text-gray-600 hover:text-red-400 p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <div
                    className="cursor-pointer p-1"
                    onClick={() => setExpandedExercise(isExpanded ? null : exLog.id)}
                  >
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                  </div>
                </div>
              </div>

              {/* Sets */}
              {isExpanded && (
                <div className="border-t border-gray-700 p-3 space-y-2">
                  {/* Header */}
                  <div className="grid grid-cols-12 gap-1 text-xs text-gray-500 font-medium px-1">
                    <div className="col-span-1">#</div>
                    <div className="col-span-1 text-center" title={language === 'es' ? 'Calentamiento' : 'Warm-up'}>W</div>
                    <div className="col-span-4 text-center">{language === 'es' ? 'Peso kg' : 'Weight kg'}</div>
                    <div className="col-span-3 text-center">Reps</div>
                    <div className="col-span-2 text-center">✓</div>
                    <div className="col-span-1"></div>
                  </div>

                  {exLog.sets.map((set) => {
                    const isWarmup = !!set.isWarmup;
                    return (
                      <div
                        key={set.id}
                        className={`grid grid-cols-12 gap-1 items-center px-1 py-1 rounded-lg transition-colors ${
                          set.completed
                            ? isWarmup ? 'bg-yellow-900/15' : 'bg-green-900/20'
                            : ''
                        }`}
                      >
                        {/* Set number / warmup label */}
                        <div className="col-span-1 text-xs font-bold">
                          {isWarmup
                            ? <span className="text-yellow-500">W</span>
                            : <span className="text-gray-500">{exLog.sets.filter(s => !s.isWarmup).indexOf(set) + 1}</span>
                          }
                        </div>

                        {/* Warm-up toggle */}
                        <div className="col-span-1 flex justify-center">
                          <button
                            onClick={() => updateSet(exLog.id, set.id, 'isWarmup', !isWarmup)}
                            className={`w-6 h-6 rounded flex items-center justify-center transition-all ${
                              isWarmup
                                ? 'bg-yellow-500/30 text-yellow-400'
                                : 'text-gray-700 hover:text-yellow-500'
                            }`}
                            title={isWarmup
                              ? (language === 'es' ? 'Quitar calentamiento' : 'Remove warm-up')
                              : (language === 'es' ? 'Marcar como calentamiento' : 'Mark as warm-up')}
                          >
                            <Flame className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="col-span-4">
                          <NumericInput
                            value={set.weight}
                            onChange={(v) => updateSet(exLog.id, set.id, 'weight', v)}
                            decimals
                            min={0}
                            step={0.5}
                            placeholder="0"
                            fallbackOnEmpty={0}
                            className={`w-full text-center border rounded-lg py-1.5 text-sm focus:outline-none focus:border-orange-500 ${
                              isWarmup
                                ? 'bg-yellow-900/10 border-yellow-800/40 text-yellow-300'
                                : 'bg-gray-700 border-gray-600 text-white'
                            }`}
                          />
                        </div>
                        <div className="col-span-3">
                          <NumericInput
                            value={set.reps}
                            onChange={(v) => updateSet(exLog.id, set.id, 'reps', v)}
                            min={0}
                            placeholder="8"
                            fallbackOnEmpty={8}
                            className={`w-full text-center border rounded-lg py-1.5 text-sm focus:outline-none focus:border-orange-500 ${
                              isWarmup
                                ? 'bg-yellow-900/10 border-yellow-800/40 text-yellow-300'
                                : 'bg-gray-700 border-gray-600 text-white'
                            }`}
                          />
                        </div>
                        <div className="col-span-2 flex justify-center">
                          <button
                            onClick={() => updateSet(exLog.id, set.id, 'completed', !set.completed)}
                            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                              set.completed
                                ? isWarmup
                                  ? 'bg-yellow-500 text-white shadow-lg shadow-yellow-900/50'
                                  : 'bg-green-500 text-white shadow-lg shadow-green-900/50'
                                : 'border-2 border-gray-600 text-gray-600 hover:border-green-500 hover:text-green-500'
                            }`}
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="col-span-1 flex justify-center">
                          <button onClick={() => removeSet(exLog.id, set.id)} className="text-gray-700 hover:text-red-400">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {/* Warmup legend if any */}
                  {exLog.sets.some(s => s.isWarmup) && (
                    <div className="flex items-center gap-1.5 text-xs text-yellow-600 px-1 pt-1">
                      <Flame className="w-3 h-3" />
                      {language === 'es'
                        ? 'Las series W (calentamiento) no cuentan para la progresión de peso'
                        : 'W (warm-up) sets are excluded from weight progression'}
                    </div>
                  )}

                  <button
                    onClick={() => addSet(exLog.id)}
                    className="w-full py-2 border border-dashed border-gray-600 text-gray-400 rounded-lg text-sm hover:border-orange-500 hover:text-orange-400 transition-colors flex items-center justify-center gap-1"
                  >
                    <Plus className="w-4 h-4" /> {t.workout.addSet}
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {/* Add exercise button */}
        <button
          onClick={() => setShowAddExercise(true)}
          className="w-full py-3 border-2 border-dashed border-gray-700 text-gray-400 rounded-xl text-sm hover:border-orange-500 hover:text-orange-400 transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5" /> {t.workout.addExercise}
        </button>
      </div>

      {/* Bottom actions */}
      <div className="bg-gray-800 border-t border-gray-700 p-4 flex gap-3 flex-shrink-0">
        <button
          onClick={handleSaveDraft}
          className="flex-1 py-3 bg-gray-700 text-gray-200 rounded-xl font-semibold hover:bg-gray-600 transition-colors flex items-center justify-center gap-2"
        >
          <Save className="w-4 h-4" /> {language === 'es' ? 'Borrador' : 'Draft'}
        </button>
        <button
          onClick={handleFinish}
          className="flex-1 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl font-semibold hover:from-orange-600 hover:to-red-700 transition-all shadow-lg shadow-orange-900/30 flex items-center justify-center gap-2"
        >
          <Check className="w-4 h-4" /> {t.workout.finish}
        </button>
      </div>

      {/* Add Exercise Modal */}
      {showAddExercise && (
        <div className="absolute inset-0 bg-gray-900/95 z-10 flex flex-col">
          <div className="bg-gray-800 border-b border-gray-700 p-4 flex items-center gap-3">
            <button onClick={() => { setShowAddExercise(false); setExerciseSearch(''); }} className="text-gray-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={exerciseSearch}
                onChange={e => setExerciseSearch(e.target.value)}
                placeholder={t.workout.searchExercises}
                className="w-full pl-9 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-orange-500"
                autoFocus
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {filteredExercises.length === 0 && (
              <p className="text-center text-gray-500 text-sm py-8">{t.workout.noExercisesFound}</p>
            )}
            {filteredExercises.map((ex: Exercise) => {
              const alreadyAdded = session.exercises.some(e => e.exerciseId === ex.id);
              return (
                <button
                  key={ex.id}
                  onClick={() => !alreadyAdded && addExercise(ex.id)}
                  disabled={alreadyAdded}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-colors ${
                    alreadyAdded
                      ? 'border-gray-700 bg-gray-800/30 opacity-50 cursor-not-allowed'
                      : 'border-gray-700 bg-gray-800 hover:border-orange-500 hover:bg-gray-700'
                  }`}
                >
                  <img
                    src={ex.imageUrl}
                    alt={ex.name}
                    className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                    onError={e => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=100&q=60'; }}
                  />
                  <div>
                    <div className="text-white font-medium text-sm">{ex.name}</div>
                    <div className="text-orange-400 text-xs">{ex.primaryMuscles.map((m: MuscleGroup) => muscleLabelMap[m] || m).join(', ')}</div>
                    <div className="text-gray-500 text-xs">{ex.secondaryMuscles.map((m: MuscleGroup) => muscleLabelMap[m] || m).join(' · ')}</div>
                  </div>
                  {alreadyAdded && <span className="ml-auto text-xs text-gray-500">{language === 'es' ? 'Ya añadido' : 'Added'}</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
