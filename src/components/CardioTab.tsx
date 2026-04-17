import { useState } from 'react';
import { CardioSession, UserProfile } from '../types';
import { Plus, Trash2, Heart, Clock, Flame, Activity } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Props {
  profile: UserProfile | null;
  cardioSessions: CardioSession[];
  onSaveCardio: (session: CardioSession) => void;
  onDeleteCardio: (id: string) => void;
}

const CARDIO_TYPES = ['Running', 'Rowing', 'Bicycle', 'Swimming', 'Other'] as const;

export default function CardioTab({ profile, cardioSessions, onSaveCardio, onDeleteCardio }: Props) {
  const [showAdd, setShowAdd] = useState(false);
  const [type, setType] = useState<'Running' | 'Rowing' | 'Bicycle' | 'Swimming' | 'Other'>('Running');
  const [duration, setDuration] = useState<number>(30);
  const [avgHR, setAvgHR] = useState<number>(130);

  const calculateCalories = (durMin: number, hr: number): number => {
    if (!profile?.details) {
      return durMin * 10;
    }
    const { age, weight, gender } = profile.details;
    if (gender === 'male') {
      const c = ((age * 0.2017) + (weight * 0.1988) + (hr * 0.6309) - 55.0969) * durMin / 4.184;
      return Math.max(0, Math.round(c));
    } else {
      const c = ((age * 0.074) - (weight * 0.1263) + (hr * 0.4472) - 20.4022) * durMin / 4.184;
      return Math.max(0, Math.round(c));
    }
  };

  const handleSave = () => {
    const caloriesBurned = calculateCalories(duration, avgHR);
    const newSession: CardioSession = {
      id: Math.random().toString(36).slice(2) + Date.now().toString(36),
      date: new Date().toISOString(),
      type,
      durationMinutes: duration,
      avgHR,
      caloriesBurned,
    };
    onSaveCardio(newSession);
    setShowAdd(false);
  };

  const totalCalories = cardioSessions.reduce((sum, s) => sum + s.caloriesBurned, 0);
  const totalMinutes = cardioSessions.reduce((sum, s) => sum + s.durationMinutes, 0);

  return (
    <div className="flex flex-col h-full p-4 space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 flex items-center justify-between">
          <div>
            <span className="text-xs text-gray-400">Calorías Totales</span>
            <div className="text-2xl font-bold text-orange-400 mt-1">{totalCalories} <span className="text-xs font-normal">kcal</span></div>
          </div>
          <Flame className="w-8 h-8 text-orange-500/30" />
        </div>
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 flex items-center justify-between">
          <div>
            <span className="text-xs text-gray-400">Tiempo Total</span>
            <div className="text-2xl font-bold text-blue-400 mt-1">{totalMinutes} <span className="text-xs font-normal">min</span></div>
          </div>
          <Clock className="w-8 h-8 text-blue-500/30" />
        </div>
      </div>

      {!profile?.details && (
        <div className="bg-amber-900/20 border border-amber-800/40 rounded-xl p-3 text-amber-300 text-xs flex items-center gap-2">
          <Activity className="w-4 h-4 flex-shrink-0" />
          <span>Configura tu peso y edad en Ajustes para una estimación calórica precisa.</span>
        </div>
      )}

      <button
        onClick={() => setShowAdd(true)}
        className="w-full py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-indigo-700 transition-all shadow-lg flex items-center justify-center gap-2"
      >
        <Plus className="w-5 h-5" /> Registrar Cardio
      </button>

      <div className="flex-1 overflow-y-auto space-y-3">
        {cardioSessions.length === 0 ? (
          <div className="text-center py-12 text-gray-500 text-sm">Sin sesiones registradas aún</div>
        ) : (
          [...cardioSessions].reverse().map(session => (
            <div key={session.id} className="bg-gray-800 border border-gray-700 rounded-xl p-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-white font-bold">{session.type}</span>
                  <span className="text-xs text-gray-400 font-normal">
                    {format(new Date(session.date), "dd/MM HH:mm", { locale: es })}
                  </span>
                </div>
                <div className="flex gap-4 mt-2 text-xs text-gray-400">
                  <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-blue-400" /> {session.durationMinutes} min</span>
                  <span className="flex items-center gap-1"><Heart className="w-3.5 h-3.5 text-red-500" /> {session.avgHR} bpm</span>
                  <span className="flex items-center gap-1"><Flame className="w-3.5 h-3.5 text-orange-400" /> {session.caloriesBurned} kcal</span>
                </div>
              </div>

              <button
                onClick={() => onDeleteCardio(session.id)}
                className="text-gray-500 hover:text-red-400 p-1.5 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>

      {showAdd && (
        <div className="absolute inset-0 bg-gray-900/98 z-50 flex flex-col justify-center p-4">
          <div className="bg-gray-800 rounded-2xl border border-gray-700 p-4 space-y-4 max-w-sm mx-auto w-full">
            <h3 className="text-white font-bold text-center border-b border-gray-700 pb-2">Registrar Cardio</h3>

            <div>
              <label className="text-gray-400 text-xs block mb-1">Actividad</label>
              <div className="grid grid-cols-3 gap-2">
                {CARDIO_TYPES.map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className={`py-2 text-xs rounded-lg border font-semibold transition-colors ${type === t ? 'border-blue-500 bg-blue-500/20 text-blue-400' : 'border-gray-700 bg-gray-900 text-gray-400'}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-gray-400 text-xs block mb-1">Duración (minutos)</label>
              <input
                type="number"
                value={duration}
                onChange={e => setDuration(Math.max(1, parseInt(e.target.value) || 0))}
                className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-white text-center focus:outline-none focus:border-blue-500 font-bold text-sm"
              />
            </div>

            <div>
              <label className="text-gray-400 text-xs block mb-1">Frecuencia Cardiaca Media (bpm)</label>
              <input
                type="number"
                value={avgHR}
                onChange={e => setAvgHR(Math.max(40, parseInt(e.target.value) || 0))}
                className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-white text-center focus:outline-none focus:border-blue-500 font-bold text-sm"
              />
            </div>

            <div className="pt-2 flex gap-3">
              <button
                onClick={() => setShowAdd(false)}
                className="flex-1 py-2 text-gray-400 rounded-xl font-medium border border-gray-700 hover:bg-gray-700 transition-colors text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                className="flex-1 py-2 bg-blue-600 text-white font-bold rounded-xl shadow-md transition-colors text-sm"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
