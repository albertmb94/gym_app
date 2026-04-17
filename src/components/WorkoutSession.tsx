import { useState, useEffect, useRef } from 'react';
import { WorkoutSession as WorkoutSessionType, ExerciseLog, SetLog, UserProfile } from '../types';
import { MUSCLE_LABELS } from '../data/exercises';
import { Plus, Trash2, Check, ChevronDown, ChevronUp, Timer, Save, X, Search } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Props {
  session: WorkoutSessionType;
  profile: UserProfile | null;
  onSave: (session: WorkoutSessionType) => void;
  onClose: () => void;
  getSuggestedSets: (exerciseId: string, numSets: number, defaultReps: number, defaultWeight: number) => { reps: number; weight: number }[];
  allExercises: any[];
}

function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export default function WorkoutSession({ session: initialSession, profile, onSave, onClose, getSuggestedSets, allExercises }: Props) {
  const [session, setSession] = useState<WorkoutSessionType>(initialSession);
  const [expandedExercise, setExpandedExercise] = useState<string | null>(
    initialSession.exercises[0]?.id || null
  );
  const [timer, setTimer] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [exerciseSearch, setExerciseSearch] = useState('');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (timerRunning) {
      intervalRef.current = setInterval(() => setTimer(t => t + 1), 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [timerRunning]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

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

  const handleFinish = () => {
    const durationMinutes = Math.max(1, Math.floor(timer / 60));
    // Calculate burned calories: MET method for strength is MET = 5
    // kcal = MET * 3.5 * weight(kg) / 200 * durationMinutes
    const userWeight = profile?.details?.weight || 70;
    const caloriesBurned = Math.round(5 * 3.5 * userWeight / 200 * durationMinutes);

    const finished = { ...session, completed: true, durationMinutes, caloriesBurned };
    onSave(finished);
    onClose();
  };

  const handleSaveDraft = () => {
    onSave(session);
    onClose();
  };

  const totalVolume = session.exercises.reduce((sum, ex) =>
    sum + ex.sets.filter(s => s.completed).reduce((s2, s) => s2 + s.reps * s.weight, 0), 0
  );

  const completedSets = session.exercises.reduce((sum, ex) => sum + ex.sets.filter(s => s.completed).length, 0);
  const totalSets = session.exercises.reduce((sum, ex) => sum + ex.sets.length, 0);

  const filteredExercises = allExercises.filter(ex =>
    ex.name.toLowerCase().includes(exerciseSearch.toLowerCase()) ||
    ex.primaryMuscles.some((m: string) => MUSCLE_LABELS[m]?.toLowerCase().includes(exerciseSearch.toLowerCase()))
  );

  return (
    <div className="fixed inset-0 bg-gray-900 z-50 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div>
          <h2 className="text-white font-bold text-lg">{session.name}</h2>
          <p className="text-gray-400 text-sm">{format(new Date(session.date), "EEEE d MMM", { locale: es })}</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Timer */}
          <button
            onClick={() => setTimerRunning(r => !r)}
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
          <div className="text-gray-500 text-xs">Series</div>
        </div>
        <div className="text-center">
          <div className="text-orange-400 font-bold">{totalVolume.toLocaleString()} kg</div>
          <div className="text-gray-500 text-xs">Volumen</div>
        </div>
        <div className="text-center">
          <div className="text-orange-400 font-bold">{session.exercises.length}</div>
          <div className="text-gray-500 text-xs">Ejercicios</div>
        </div>
      </div>

      {/* Exercise list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {session.exercises.map((exLog) => {
          const exercise = allExercises.find(e => e.id === exLog.exerciseId);
          if (!exercise) return null;
          const isExpanded = expandedExercise === exLog.id;
          const completedCount = exLog.sets.filter(s => s.completed).length;

          return (
            <div key={exLog.id} className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
              {/* Exercise header */}
              <div
                className="flex items-center justify-between p-3 cursor-pointer"
                onClick={() => setExpandedExercise(isExpanded ? null : exLog.id)}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={exercise.imageUrl}
                    alt={exercise.name}
                    className="w-12 h-12 rounded-lg object-cover flex-shrink-0 bg-gray-950"
                    onError={e => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=100&q=60'; }}
                  />
                  <div className="min-w-0">
                    <div className="font-semibold text-white text-sm truncate">{exercise.name}</div>
                    <div className="text-xs text-gray-400">
                      {exercise.primaryMuscles.map((m: string) => MUSCLE_LABELS[m]).join(', ')}
                    </div>
                    <div className="text-xs text-orange-400 font-medium">{completedCount}/{exLog.sets.length} series</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={e => { e.stopPropagation(); removeExercise(exLog.id); }}
                    className="text-gray-600 hover:text-red-400 p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </div>
              </div>

              {/* Sets */}
              {isExpanded && (
                <div className="border-t border-gray-700 p-3 space-y-2">
                  {/* Header row */}
                  <div className="grid grid-cols-12 gap-2 text-xs text-gray-500 font-medium px-1">
                    <div className="col-span-1">#</div>
                    <div className="col-span-4 text-center">Peso (kg)</div>
                    <div className="col-span-4 text-center">Reps</div>
                    <div className="col-span-2 text-center">✓</div>
                    <div className="col-span-1"></div>
                  </div>

                  {exLog.sets.map((set, setIdx) => (
                    <div
                      key={set.id}
                      className={`grid grid-cols-12 gap-2 items-center px-1 py-1 rounded-lg transition-colors ${set.completed ? 'bg-green-900/20' : ''}`}
                    >
                      <div className="col-span-1 text-gray-500 text-sm font-bold">{setIdx + 1}</div>
                      <div className="col-span-4">
                        <input
                          type="number"
                          value={set.weight}
                          onChange={e => updateSet(exLog.id, set.id, 'weight', parseFloat(e.target.value) || 0)}
                          className="w-full text-center bg-gray-700 border border-gray-600 rounded-lg py-1.5 text-white text-sm focus:outline-none focus:border-orange-500"
                          min="0"
                          step="0.5"
                        />
                      </div>
                      <div className="col-span-4">
                        <input
                          type="number"
                          value={set.reps}
                          onChange={e => updateSet(exLog.id, set.id, 'reps', parseInt(e.target.value) || 0)}
                          className="w-full text-center bg-gray-700 border border-gray-600 rounded-lg py-1.5 text-white text-sm focus:outline-none focus:border-orange-500"
                          min="0"
                        />
                      </div>
                      <div className="col-span-2 flex justify-center">
                        <button
                          onClick={() => updateSet(exLog.id, set.id, 'completed', !set.completed)}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                            set.completed
                              ? 'bg-green-500 text-white shadow-lg shadow-green-900/50'
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
                  ))}

                  <button
                    onClick={() => addSet(exLog.id)}
                    className="w-full py-2 border border-dashed border-gray-600 text-gray-400 rounded-lg text-sm hover:border-orange-500 hover:text-orange-400 transition-colors flex items-center justify-center gap-1"
                  >
                    <Plus className="w-4 h-4" /> Añadir serie
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
          <Plus className="w-5 h-5" /> Añadir ejercicio
        </button>
      </div>

      {/* Bottom actions */}
      <div className="bg-gray-800 border-t border-gray-700 p-4 flex gap-3 flex-shrink-0">
        <button
          onClick={handleSaveDraft}
          className="flex-1 py-3 bg-gray-700 text-gray-200 rounded-xl font-semibold hover:bg-gray-600 transition-colors flex items-center justify-center gap-2"
        >
          <Save className="w-4 h-4" /> Guardar borrador
        </button>
        <button
          onClick={handleFinish}
          className="flex-1 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl font-semibold hover:from-orange-600 hover:to-red-700 transition-all shadow-lg shadow-orange-900/30 flex items-center justify-center gap-2"
        >
          <Check className="w-4 h-4" /> Finalizar
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
                placeholder="Buscar ejercicio..."
                className="w-full pl-9 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-orange-500"
                autoFocus
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {filteredExercises.map(ex => {
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
                    <div className="text-orange-400 text-xs">{ex.primaryMuscles.map((m: string) => MUSCLE_LABELS[m]).join(', ')}</div>
                    <div className="text-gray-500 text-xs">{ex.secondaryMuscles.map((m: string) => MUSCLE_LABELS[m]).join(' · ')}</div>
                  </div>
                  {alreadyAdded && <span className="ml-auto text-xs text-gray-500">Ya añadido</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
