import { useState, useMemo } from 'react';
import { WorkoutSession, MuscleGroup } from '../types';
import { WORKOUT_TYPE_LABELS, WORKOUT_TYPE_COLORS, ALL_MUSCLES } from '../data/exercises';
import { useExercises } from '../contexts/ExercisesContext';
import { useLanguage } from '../contexts/LanguageContext';
import { format } from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import { ChevronDown, ChevronUp, Trash2, Play, CheckCircle, Clock, Dumbbell, Flame, Filter } from 'lucide-react';

interface Props {
  sessions: WorkoutSession[];
  onDelete: (id: string) => void;
  onContinue: (session: WorkoutSession) => void;
}

type FilterMode = 'all' | 'muscle' | 'exercise';

export default function HistoryTab({ sessions, onDelete, onContinue }: Props) {
  const { t, language } = useLanguage();
  const { allExercises, getExerciseById } = useExercises();
  const dateLocale = language === 'es' ? es : enUS;

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [selectedMuscle, setSelectedMuscle] = useState<MuscleGroup | null>(null);
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);

  const sorted = useMemo(() =>
    [...sessions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [sessions]
  );

  // Muscles that actually appear in this user's history
  const usedMuscles = useMemo(() => {
    const used = new Set<string>();
    sorted.forEach(s => {
      s.exercises.forEach(exLog => {
        const ex = getExerciseById(exLog.exerciseId);
        if (!ex) return;
        ex.primaryMuscles.forEach(m => used.add(m));
      });
    });
    return ALL_MUSCLES.filter(m => used.has(m));
  }, [sorted, getExerciseById]);

  // Exercises that actually appear in history (for filter dropdown)
  const usedExercises = useMemo(() => {
    const ids = new Set<string>();
    sorted.forEach(s => s.exercises.forEach(e => ids.add(e.exerciseId)));
    return allExercises.filter(e => ids.has(e.id));
  }, [sorted, allExercises]);

  const filtered = useMemo(() => {
    if (filterMode === 'muscle' && selectedMuscle) {
      return sorted.filter(s =>
        s.exercises.some(exLog => {
          const ex = getExerciseById(exLog.exerciseId);
          return ex && (ex.primaryMuscles.includes(selectedMuscle) || ex.secondaryMuscles.includes(selectedMuscle));
        })
      );
    }
    if (filterMode === 'exercise' && selectedExerciseId) {
      return sorted.filter(s => s.exercises.some(e => e.exerciseId === selectedExerciseId));
    }
    return sorted;
  }, [sorted, filterMode, selectedMuscle, selectedExerciseId, getExerciseById]);

  const muscleLabels = t.muscles as Record<string, string>;

  if (sorted.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center px-4">
        <Dumbbell className="w-16 h-16 text-gray-700 mb-4" />
        <h3 className="text-gray-400 text-lg font-semibold mb-2">{t.history.noWorkouts}</h3>
        <p className="text-gray-600 text-sm">{t.history.noWorkoutsDesc}</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      {/* Filter bar */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <button
            onClick={() => setFilterMode('all')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filterMode === 'all' ? 'bg-orange-600 text-white' : 'bg-gray-800 text-gray-400 border border-gray-700'}`}
          >
            {t.history.allWorkouts}
          </button>
          <button
            onClick={() => { setFilterMode('muscle'); if (!selectedMuscle && usedMuscles.length) setSelectedMuscle(usedMuscles[0] as MuscleGroup); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filterMode === 'muscle' ? 'bg-orange-600 text-white' : 'bg-gray-800 text-gray-400 border border-gray-700'}`}
          >
            <Filter className="w-3.5 h-3.5" /> {t.history.filterByMuscle}
          </button>
          <button
            onClick={() => { setFilterMode('exercise'); if (!selectedExerciseId && usedExercises.length) setSelectedExerciseId(usedExercises[0].id); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filterMode === 'exercise' ? 'bg-orange-600 text-white' : 'bg-gray-800 text-gray-400 border border-gray-700'}`}
          >
            <Filter className="w-3.5 h-3.5" /> {t.history.filterByExercise}
          </button>
        </div>

        {filterMode === 'muscle' && (
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {usedMuscles.map(m => (
              <button
                key={m}
                onClick={() => setSelectedMuscle(m as MuscleGroup)}
                className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors ${selectedMuscle === m ? 'bg-orange-500 text-white' : 'bg-gray-700 text-gray-300'}`}
              >
                {muscleLabels[m] || m}
              </button>
            ))}
          </div>
        )}

        {filterMode === 'exercise' && (
          <select
            value={selectedExerciseId || ''}
            onChange={e => setSelectedExerciseId(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500"
          >
            {usedExercises.map(ex => (
              <option key={ex.id} value={ex.id}>{ex.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* Result count when filtered */}
      {filterMode !== 'all' && (
        <p className="text-gray-500 text-xs">
          {filtered.length} {filtered.length === 1 ? 'entrenamiento' : 'entrenamientos'}
        </p>
      )}

      {filtered.length === 0 && (
        <div className="text-center py-10 text-gray-500 text-sm">{t.history.noResultsFilter}</div>
      )}

      {filtered.map(session => {
        const isExpanded = expandedId === session.id;
        const totalVolume = session.exercises.reduce((sum, ex) =>
          sum + ex.sets.filter(s => s.completed).reduce((s2, s) => s2 + s.reps * s.weight, 0), 0
        );
        const completedSets = session.exercises.reduce((sum, ex) => sum + ex.sets.filter(s => s.completed).length, 0);
        const totalSets = session.exercises.reduce((sum, ex) => sum + ex.sets.length, 0);
        const typeColor = WORKOUT_TYPE_COLORS[session.type] || '#6b7280';
        const typeLabel = t.workoutTypes[session.type as keyof typeof t.workoutTypes] || WORKOUT_TYPE_LABELS[session.type];

        return (
          <div key={session.id} className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
            <div
              className="p-4 cursor-pointer"
              onClick={() => setExpandedId(isExpanded ? null : session.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="text-xs font-bold px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: typeColor + '30', color: typeColor }}
                    >
                      {typeLabel}
                    </span>
                    {session.completed
                      ? <CheckCircle className="w-4 h-4 text-green-500" />
                      : <Clock className="w-4 h-4 text-yellow-500" />
                    }
                  </div>
                  <h3 className="text-white font-semibold">{session.name}</h3>
                  <p className="text-gray-400 text-sm">
                    {format(new Date(session.date), "EEEE, d 'de' MMMM yyyy", { locale: dateLocale })}
                  </p>
                </div>

                <div className="flex items-center gap-1">
                  {!session.completed && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onContinue(session); }}
                      className="p-2 text-orange-400 hover:bg-orange-500/10 rounded-lg transition-colors"
                    >
                      <Play className="w-5 h-5" />
                    </button>
                  )}
                  {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0" /> : <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />}
                </div>
              </div>

              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3">
                <div className="whitespace-nowrap">
                  <span className="text-orange-400 font-bold text-sm">{totalVolume.toLocaleString()}</span>
                  <span className="text-gray-500 text-xs ml-1">{t.history.vol}</span>
                </div>
                <div className="whitespace-nowrap">
                  <span className="text-orange-400 font-bold text-sm">{completedSets}/{totalSets}</span>
                  <span className="text-gray-500 text-xs ml-1">{t.history.sets}</span>
                </div>
                <div className="whitespace-nowrap">
                  <span className="text-orange-400 font-bold text-sm">{session.exercises.length}</span>
                  <span className="text-gray-500 text-xs ml-1">{t.history.exercises}</span>
                </div>
                {session.durationMinutes && (
                  <div className="whitespace-nowrap">
                    <span className="text-orange-400 font-bold text-sm">{session.durationMinutes}</span>
                    <span className="text-gray-500 text-xs ml-1">{t.history.min}</span>
                  </div>
                )}
                {session.caloriesBurned && session.caloriesBurned > 0 && (
                  <div className="flex items-center gap-1 whitespace-nowrap">
                    <Flame className="w-3 h-3 text-orange-400" />
                    <span className="text-orange-400 font-bold text-sm">{session.caloriesBurned}</span>
                    <span className="text-gray-500 text-xs">kcal</span>
                  </div>
                )}
              </div>
            </div>

            {isExpanded && (
              <div className="border-t border-gray-700 p-4 space-y-3">
                {session.exercises.map(exLog => {
                  const ex = getExerciseById(exLog.exerciseId);
                  if (!ex) return null;
                  const exVolume = exLog.sets.filter(s => s.completed).reduce((s, set) => s + set.reps * set.weight, 0);
                  return (
                    <div key={exLog.id} className="bg-gray-700/50 rounded-lg p-3">
                      <div className="flex items-center gap-3 mb-2">
                        <img
                          src={ex.imageUrl}
                          alt={ex.name}
                          className="w-10 h-10 rounded-lg object-cover"
                          onError={e => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=100&q=60'; }}
                        />
                        <div>
                          <div className="text-white font-medium text-sm">{ex.name}</div>
                          <div className="text-gray-400 text-xs">
                            {ex.primaryMuscles.map(m => muscleLabels[m] || m).join(', ')} · {exVolume} kg vol.
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-1 text-xs">
                        {exLog.sets.map((set, i) => (
                          <div
                            key={set.id}
                            className={`flex items-center gap-1 px-2 py-1 rounded ${set.completed ? 'bg-green-900/30 text-green-400' : 'bg-gray-700 text-gray-500'}`}
                          >
                            <span className="font-bold">{i + 1}.</span>
                            <span>{set.weight}kg × {set.reps}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}

                <div className="flex gap-2 mt-4">
                  {!session.completed && (
                    <button
                      onClick={() => onContinue(session)}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 transition-colors"
                    >
                      <Play className="w-4 h-4" /> {t.general.continue}
                    </button>
                  )}
                  {confirmDelete === session.id ? (
                    <div className="flex-1 flex gap-2">
                      <button
                        onClick={() => { onDelete(session.id); setConfirmDelete(null); }}
                        className="flex-1 py-2.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
                      >
                        {t.general.confirm}
                      </button>
                      <button
                        onClick={() => setConfirmDelete(null)}
                        className="flex-1 py-2.5 bg-gray-700 text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-600"
                      >
                        {t.general.cancel}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDelete(session.id)}
                      className="flex items-center gap-1.5 px-4 py-2.5 bg-gray-700 text-gray-400 rounded-lg text-sm hover:bg-red-900/30 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
