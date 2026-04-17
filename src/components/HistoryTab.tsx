import { useState } from 'react';
import { WorkoutSession } from '../types';
import { EXERCISES, MUSCLE_LABELS, WORKOUT_TYPE_LABELS, WORKOUT_TYPE_COLORS } from '../data/exercises';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronDown, ChevronUp, Trash2, Play, CheckCircle, Clock, Dumbbell } from 'lucide-react';

interface Props {
  sessions: WorkoutSession[];
  onDelete: (id: string) => void;
  onContinue: (session: WorkoutSession) => void;
}

export default function HistoryTab({ sessions, onDelete, onContinue }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const sorted = [...sessions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (sorted.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center px-4">
        <Dumbbell className="w-16 h-16 text-gray-700 mb-4" />
        <h3 className="text-gray-400 text-lg font-semibold mb-2">Sin entrenamientos aún</h3>
        <p className="text-gray-600 text-sm">Comienza un nuevo entrenamiento para ver tu historial aquí.</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      {sorted.map(session => {
        const isExpanded = expandedId === session.id;
        const totalVolume = session.exercises.reduce((sum, ex) =>
          sum + ex.sets.filter(s => s.completed).reduce((s2, s) => s2 + s.reps * s.weight, 0), 0
        );
        const completedSets = session.exercises.reduce((sum, ex) => sum + ex.sets.filter(s => s.completed).length, 0);
        const totalSets = session.exercises.reduce((sum, ex) => sum + ex.sets.length, 0);
        const typeColor = WORKOUT_TYPE_COLORS[session.type] || '#6b7280';

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
                      {WORKOUT_TYPE_LABELS[session.type]}
                    </span>
                    {session.completed
                      ? <CheckCircle className="w-4 h-4 text-green-500" />
                      : <Clock className="w-4 h-4 text-yellow-500" />
                    }
                  </div>
                  <h3 className="text-white font-semibold">{session.name}</h3>
                  <p className="text-gray-400 text-sm">
                    {format(new Date(session.date), "EEEE, d 'de' MMMM yyyy", { locale: es })}
                  </p>
                </div>
                {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0" /> : <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />}
              </div>

              <div className="flex gap-4 mt-3">
                <div>
                  <span className="text-orange-400 font-bold text-sm">{totalVolume.toLocaleString()}</span>
                  <span className="text-gray-500 text-xs ml-1">kg vol.</span>
                </div>
                <div>
                  <span className="text-orange-400 font-bold text-sm">{completedSets}/{totalSets}</span>
                  <span className="text-gray-500 text-xs ml-1">series</span>
                </div>
                <div>
                  <span className="text-orange-400 font-bold text-sm">{session.exercises.length}</span>
                  <span className="text-gray-500 text-xs ml-1">ejercicios</span>
                </div>
                {session.durationMinutes && (
                  <div>
                    <span className="text-orange-400 font-bold text-sm">{session.durationMinutes}</span>
                    <span className="text-gray-500 text-xs ml-1">min</span>
                  </div>
                )}
              </div>
            </div>

            {isExpanded && (
              <div className="border-t border-gray-700 p-4 space-y-3">
                {session.exercises.map(exLog => {
                  const ex = EXERCISES.find(e => e.id === exLog.exerciseId);
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
                          <div className="text-gray-400 text-xs">{ex.primaryMuscles.map(m => MUSCLE_LABELS[m]).join(', ')} · {exVolume} kg vol.</div>
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
                      <Play className="w-4 h-4" /> Continuar
                    </button>
                  )}
                  {confirmDelete === session.id ? (
                    <div className="flex-1 flex gap-2">
                      <button
                        onClick={() => { onDelete(session.id); setConfirmDelete(null); }}
                        className="flex-1 py-2.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
                      >
                        Confirmar
                      </button>
                      <button
                        onClick={() => setConfirmDelete(null)}
                        className="flex-1 py-2.5 bg-gray-700 text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-600"
                      >
                        Cancelar
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
