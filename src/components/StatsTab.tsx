import { useState, useMemo } from 'react';
import { WorkoutSession, MuscleGroup, CardioSession } from '../types';
import { EXERCISES, MUSCLE_LABELS } from '../data/exercises';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar
} from 'recharts';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { TrendingUp, BarChart2, Activity, Flame, Heart } from 'lucide-react';

interface Props {
  sessions: WorkoutSession[];
  cardioSessions?: CardioSession[];
}

const ALL_MUSCLES: MuscleGroup[] = [
  'pectoral', 'triceps', 'biceps', 'shoulder', 'back', 'lats',
  'trapezius', 'core', 'quadriceps', 'hamstrings', 'glutes', 'calves', 'forearms',
];

const MUSCLE_COLORS: Record<string, string> = {
  pectoral: '#f97316', triceps: '#fb923c', biceps: '#3b82f6', shoulder: '#a78bfa',
  back: '#34d399', lats: '#10b981', trapezius: '#6ee7b7', core: '#fbbf24',
  quadriceps: '#ef4444', hamstrings: '#f87171', glutes: '#ec4899', calves: '#8b5cf6',
  forearms: '#94a3b8',
};

type ViewMode = 'exercise' | 'muscle' | 'calories';
type MetricMode = 'maxWeight' | 'totalVolume' | 'totalReps';

export default function StatsTab({ sessions, cardioSessions = [] }: Props) {
  const [viewMode, setViewMode] = useState<ViewMode>('exercise');
  const [selectedExerciseId, setSelectedExerciseId] = useState(EXERCISES[0].id);
  const [selectedMuscle, setSelectedMuscle] = useState<MuscleGroup>('pectoral');
  const [metric, setMetric] = useState<MetricMode>('maxWeight');

  const completedSessions = useMemo(() =>
    sessions.filter(s => s.completed).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [sessions]
  );

  // Exercise chart data
  const exerciseData = useMemo(() => {
    return completedSessions
      .filter(s => s.exercises.some(e => e.exerciseId === selectedExerciseId))
      .map(s => {
        const exLog = s.exercises.find(e => e.exerciseId === selectedExerciseId)!;
        const completedSets = exLog.sets.filter(s => s.completed);
        const maxWeight = completedSets.length ? Math.max(...completedSets.map(s => s.weight)) : 0;
        const totalVolume = completedSets.reduce((sum, s) => sum + s.reps * s.weight, 0);
        const totalReps = completedSets.reduce((sum, s) => sum + s.reps, 0);
        return {
          date: format(new Date(s.date), 'dd/MM', { locale: es }),
          fullDate: format(new Date(s.date), "d MMM yy", { locale: es }),
          maxWeight,
          totalVolume,
          totalReps,
          sets: completedSets.length,
        };
      });
  }, [completedSessions, selectedExerciseId]);



  // Muscle frequency data
  const muscleFrequency = useMemo(() => {
    const freq: Record<string, number> = {};
    completedSessions.forEach(s => {
      const muscles = new Set<string>();
      s.exercises.forEach(exLog => {
        const ex = EXERCISES.find(e => e.id === exLog.exerciseId);
        if (!ex) return;
        ex.primaryMuscles.forEach(m => muscles.add(m));
        ex.secondaryMuscles.forEach(m => muscles.add(m));
      });
      muscles.forEach(m => { freq[m] = (freq[m] || 0) + 1; });
    });
    return ALL_MUSCLES
      .filter(m => freq[m])
      .map(m => ({ muscle: MUSCLE_LABELS[m], count: freq[m], color: MUSCLE_COLORS[m] }))
      .sort((a, b) => b.count - a.count);
  }, [completedSessions]);

  // Selected muscle evolution
  const muscleData = useMemo(() => {
    return completedSessions
      .filter(s => s.exercises.some(exLog => {
        const ex = EXERCISES.find(e => e.id === exLog.exerciseId);
        return ex && (ex.primaryMuscles.includes(selectedMuscle) || ex.secondaryMuscles.includes(selectedMuscle));
      }))
      .map(s => {
        let totalVol = 0;
        let maxW = 0;
        s.exercises.forEach(exLog => {
          const ex = EXERCISES.find(e => e.id === exLog.exerciseId);
          if (!ex) return;
          if (!ex.primaryMuscles.includes(selectedMuscle) && !ex.secondaryMuscles.includes(selectedMuscle)) return;
          const completedSets = exLog.sets.filter(s => s.completed);
          const vol = completedSets.reduce((sum, s) => sum + s.reps * s.weight, 0);
          const w = completedSets.length ? Math.max(...completedSets.map(s => s.weight)) : 0;
          totalVol += vol;
          maxW = Math.max(maxW, w);
        });
        return {
          date: format(new Date(s.date), 'dd/MM'),
          fullDate: format(new Date(s.date), "d MMM yy", { locale: es }),
          totalVolume: totalVol,
          maxWeight: maxW,
        };
      });
  }, [completedSessions, selectedMuscle]);

  const metricLabel: Record<MetricMode, string> = {
    maxWeight: 'Peso máximo (kg)',
    totalVolume: 'Volumen total (kg)',
    totalReps: 'Reps totales',
  };

  if (completedSessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center px-4">
        <BarChart2 className="w-16 h-16 text-gray-700 mb-4" />
        <h3 className="text-gray-400 text-lg font-semibold mb-2">Sin datos aún</h3>
        <p className="text-gray-600 text-sm">Completa entrenamientos para ver tus estadísticas aquí.</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-gray-800 rounded-xl p-3 border border-gray-700 text-center">
          <div className="text-2xl font-bold text-orange-400">{completedSessions.length}</div>
          <div className="text-gray-500 text-xs mt-1">Entrenos</div>
        </div>
        <div className="bg-gray-800 rounded-xl p-3 border border-gray-700 text-center">
          <div className="text-2xl font-bold text-orange-400">
            {(completedSessions.reduce((sum, s) =>
              sum + s.exercises.reduce((s2, ex) =>
                s2 + ex.sets.filter(s => s.completed).reduce((s3, set) => s3 + set.reps * set.weight, 0), 0), 0
            ) / 1000).toFixed(1)}t
          </div>
          <div className="text-gray-500 text-xs mt-1">Volumen total</div>
        </div>
        <div className="bg-gray-800 rounded-xl p-3 border border-gray-700 text-center">
          <div className="text-2xl font-bold text-orange-400">
            {completedSessions.reduce((sum, s) =>
              sum + s.exercises.reduce((s2, ex) => s2 + ex.sets.filter(s => s.completed).length, 0), 0
            )}
          </div>
          <div className="text-gray-500 text-xs mt-1">Series totales</div>
        </div>
      </div>

      {/* View mode tabs */}
      <div className="flex bg-gray-800 rounded-xl p-1 gap-1">
        <button
          onClick={() => setViewMode('exercise')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${viewMode === 'exercise' ? 'bg-orange-600 text-white' : 'text-gray-400 hover:text-white'}`}
        >
          <TrendingUp className="w-4 h-4" /> Ejercicio
        </button>
        <button
          onClick={() => setViewMode('muscle')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${viewMode === 'muscle' ? 'bg-orange-600 text-white' : 'text-gray-400 hover:text-white'}`}
        >
          <Activity className="w-4 h-4" /> Músculo
        </button>
        <button
          onClick={() => setViewMode('calories')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${viewMode === 'calories' ? 'bg-orange-600 text-white' : 'text-gray-400 hover:text-white'}`}
        >
          <Flame className="w-4 h-4" /> Calorías
        </button>
      </div>

      {viewMode === 'exercise' && (
        <>
          {/* Exercise selector */}
          <div>
            <label className="text-gray-400 text-sm mb-2 block">Ejercicio</label>
            <select
              value={selectedExerciseId}
              onChange={e => setSelectedExerciseId(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-orange-500"
            >
              {EXERCISES.filter(ex => completedSessions.some(s => s.exercises.some(e => e.exerciseId === ex.id))).map(ex => (
                <option key={ex.id} value={ex.id}>{ex.name}</option>
              ))}
            </select>
          </div>

          {/* Metric selector */}
          <div className="flex bg-gray-800 rounded-xl p-1 gap-1 border border-gray-700">
            {(['maxWeight', 'totalVolume', 'totalReps'] as MetricMode[]).map(m => (
              <button
                key={m}
                onClick={() => setMetric(m)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${metric === m ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-gray-300'}`}
              >
                {m === 'maxWeight' ? 'Peso máx.' : m === 'totalVolume' ? 'Volumen' : 'Reps'}
              </button>
            ))}
          </div>

          {exerciseData.length > 0 ? (
            <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
              <h3 className="text-white font-semibold mb-4">
                {EXERCISES.find(e => e.id === selectedExerciseId)?.name} — {metricLabel[metric]}
              </h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={exerciseData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="date" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                    labelStyle={{ color: '#f3f4f6' }}
                    labelFormatter={(_, payload) => payload?.[0]?.payload?.fullDate || ''}
                    formatter={(value) => [Number(value).toFixed(1), metricLabel[metric]]}
                  />
                  <Line type="monotone" dataKey={metric} stroke="#f97316" strokeWidth={2} dot={{ fill: '#f97316', r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>

              {/* Personal records */}
              {exerciseData.length > 0 && (
                <div className="mt-4 grid grid-cols-3 gap-2">
                  <div className="bg-gray-700/50 rounded-lg p-2 text-center">
                    <div className="text-orange-400 font-bold">{Math.max(...exerciseData.map(d => d.maxWeight))} kg</div>
                    <div className="text-gray-500 text-xs">Récord peso</div>
                  </div>
                  <div className="bg-gray-700/50 rounded-lg p-2 text-center">
                    <div className="text-orange-400 font-bold">{Math.max(...exerciseData.map(d => d.totalVolume)).toLocaleString()} kg</div>
                    <div className="text-gray-500 text-xs">Máx. volumen</div>
                  </div>
                  <div className="bg-gray-700/50 rounded-lg p-2 text-center">
                    <div className="text-orange-400 font-bold">{exerciseData.length}</div>
                    <div className="text-gray-500 text-xs">Sesiones</div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 text-center">
              <p className="text-gray-500 text-sm">No hay datos para este ejercicio todavía.</p>
            </div>
          )}
        </>
      )}

      {viewMode === 'muscle' && (
        <>
          {/* Muscle frequency chart */}
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <h3 className="text-white font-semibold mb-4">Frecuencia por músculo</h3>
            {muscleFrequency.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={muscleFrequency} layout="vertical" margin={{ left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis type="number" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                  <YAxis dataKey="muscle" type="category" tick={{ fill: '#9ca3af', fontSize: 10 }} width={90} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                    labelStyle={{ color: '#f3f4f6' }}
                    formatter={(value) => [Number(value), 'Sesiones']}
                  />
                  <Bar dataKey="count" fill="#f97316" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-500 text-sm text-center py-4">Sin datos</p>
            )}
          </div>

          {/* Muscle evolution */}
          <div>
            <label className="text-gray-400 text-sm mb-2 block">Músculo</label>
            <select
              value={selectedMuscle}
              onChange={e => setSelectedMuscle(e.target.value as MuscleGroup)}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-orange-500"
            >
              {ALL_MUSCLES.map(m => (
                <option key={m} value={m}>{MUSCLE_LABELS[m]}</option>
              ))}
            </select>
          </div>

          {muscleData.length > 0 ? (
            <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
              <h3 className="text-white font-semibold mb-4">
                {MUSCLE_LABELS[selectedMuscle]} — Volumen por sesión
              </h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={muscleData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="date" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                    labelStyle={{ color: '#f3f4f6' }}
                    labelFormatter={(_, payload) => payload?.[0]?.payload?.fullDate || ''}
                    formatter={(value) => [`${Number(value).toFixed(0)} kg`, 'Volumen']}
                  />
                  <Bar dataKey="totalVolume" fill={MUSCLE_COLORS[selectedMuscle] || '#f97316'} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="bg-gray-700/50 rounded-lg p-2 text-center">
                  <div className="text-orange-400 font-bold">{Math.max(...muscleData.map(d => d.totalVolume)).toLocaleString()} kg</div>
                  <div className="text-gray-500 text-xs">Máx. volumen</div>
                </div>
                <div className="bg-gray-700/50 rounded-lg p-2 text-center">
                  <div className="text-orange-400 font-bold">{muscleData.length}</div>
                  <div className="text-gray-500 text-xs">Sesiones</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 text-center">
              <p className="text-gray-500 text-sm">No hay datos para {MUSCLE_LABELS[selectedMuscle]} todavía.</p>
            </div>
          )}
        </>
      )}

      {viewMode === 'calories' && (
        <CaloriesView sessions={completedSessions} cardioSessions={cardioSessions} />
      )}
    </div>
  );
}

function CaloriesView({ sessions, cardioSessions }: { sessions: WorkoutSession[]; cardioSessions: CardioSession[] }) {
  // Combine all activities for calorie tracking
  const calorieData = useMemo(() => {
    const dataMap: Record<string, { date: string; fullDate: string; strength: number; cardio: number; total: number }> = {};
    
    sessions.forEach(s => {
      const dateKey = format(new Date(s.date), 'yyyy-MM-dd');
      if (!dataMap[dateKey]) {
        dataMap[dateKey] = {
          date: format(new Date(s.date), 'dd/MM'),
          fullDate: format(new Date(s.date), "d MMM yy", { locale: es }),
          strength: 0,
          cardio: 0,
          total: 0,
        };
      }
      dataMap[dateKey].strength += s.caloriesBurned || 0;
      dataMap[dateKey].total += s.caloriesBurned || 0;
    });
    
    cardioSessions.forEach(s => {
      const dateKey = format(new Date(s.date), 'yyyy-MM-dd');
      if (!dataMap[dateKey]) {
        dataMap[dateKey] = {
          date: format(new Date(s.date), 'dd/MM'),
          fullDate: format(new Date(s.date), "d MMM yy", { locale: es }),
          strength: 0,
          cardio: 0,
          total: 0,
        };
      }
      dataMap[dateKey].cardio += s.caloriesBurned;
      dataMap[dateKey].total += s.caloriesBurned;
    });
    
    return Object.values(dataMap).sort((a, b) => 
      new Date(a.fullDate).getTime() - new Date(b.fullDate).getTime()
    );
  }, [sessions, cardioSessions]);

  // Weekly summary
  const weeklyStats = useMemo(() => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const weekStrength = sessions
      .filter(s => new Date(s.date) >= weekAgo)
      .reduce((sum, s) => sum + (s.caloriesBurned || 0), 0);
    
    const weekCardio = cardioSessions
      .filter(s => new Date(s.date) >= weekAgo)
      .reduce((sum, s) => sum + s.caloriesBurned, 0);
    
    const weekCardioMinutes = cardioSessions
      .filter(s => new Date(s.date) >= weekAgo)
      .reduce((sum, s) => sum + s.duration, 0);
    
    return {
      strength: weekStrength,
      cardio: weekCardio,
      total: weekStrength + weekCardio,
      cardioMinutes: weekCardioMinutes,
    };
  }, [sessions, cardioSessions]);

  // Cardio type distribution
  const cardioDistribution = useMemo(() => {
    const dist: Record<string, number> = {};
    cardioSessions.forEach(s => {
      dist[s.cardioTypeId] = (dist[s.cardioTypeId] || 0) + s.caloriesBurned;
    });
    
    const cardioTypeNames: Record<string, string> = {
      running: 'Correr',
      cycling: 'Bicicleta',
      swimming: 'Natación',
      rowing: 'Remo',
      elliptical: 'Elíptica',
      walking: 'Caminar',
      hiit: 'HIIT',
      stairmaster: 'Escaladora',
      jumping_rope: 'Cuerda',
    };
    
    return Object.entries(dist)
      .map(([id, calories]) => ({
        name: cardioTypeNames[id] || id,
        calories,
      }))
      .sort((a, b) => b.calories - a.calories);
  }, [cardioSessions]);

  const totalAllTime = sessions.reduce((sum, s) => sum + (s.caloriesBurned || 0), 0) +
    cardioSessions.reduce((sum, s) => sum + s.caloriesBurned, 0);

  return (
    <div className="space-y-4">
      {/* Weekly summary cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
            <Flame size={16} className="text-orange-400" />
            Esta semana
          </div>
          <div className="text-2xl font-bold text-orange-400">{weeklyStats.total.toLocaleString()}</div>
          <div className="text-xs text-gray-500">kcal quemadas</div>
        </div>
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
            <Heart size={16} className="text-red-400" />
            Cardio
          </div>
          <div className="text-2xl font-bold text-green-400">{weeklyStats.cardioMinutes}</div>
          <div className="text-xs text-gray-500">minutos esta semana</div>
        </div>
      </div>

      {/* Breakdown */}
      <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
        <h4 className="text-sm font-semibold mb-3">Desglose semanal</h4>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-gray-400 text-sm flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-orange-500"></div>
              Fuerza
            </span>
            <span className="font-semibold">{weeklyStats.strength.toLocaleString()} kcal</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-400 text-sm flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-green-500"></div>
              Cardio
            </span>
            <span className="font-semibold">{weeklyStats.cardio.toLocaleString()} kcal</span>
          </div>
          <div className="h-2 bg-gray-700 rounded-full overflow-hidden flex">
            {weeklyStats.total > 0 && (
              <>
                <div 
                  className="h-full bg-orange-500"
                  style={{ width: `${(weeklyStats.strength / weeklyStats.total) * 100}%` }}
                />
                <div 
                  className="h-full bg-green-500"
                  style={{ width: `${(weeklyStats.cardio / weeklyStats.total) * 100}%` }}
                />
              </>
            )}
          </div>
        </div>
      </div>

      {/* Calorie chart over time */}
      {calorieData.length > 0 && (
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <h3 className="text-white font-semibold mb-4">Calorías quemadas por día</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={calorieData.slice(-14)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="date" tick={{ fill: '#9ca3af', fontSize: 11 }} />
              <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                labelStyle={{ color: '#f3f4f6' }}
                labelFormatter={(_, payload) => payload?.[0]?.payload?.fullDate || ''}
                formatter={(value, name) => [
                  `${Number(value)} kcal`,
                  name === 'strength' ? 'Fuerza' : name === 'cardio' ? 'Cardio' : 'Total'
                ]}
              />
              <Bar dataKey="strength" stackId="a" fill="#f97316" name="strength" />
              <Bar dataKey="cardio" stackId="a" fill="#22c55e" name="cardio" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Cardio distribution */}
      {cardioDistribution.length > 0 && (
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <h3 className="text-white font-semibold mb-4">Calorías por tipo de cardio</h3>
          <div className="space-y-2">
            {cardioDistribution.map(item => (
              <div key={item.name} className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex justify-between text-sm mb-1">
                    <span>{item.name}</span>
                    <span className="text-green-400">{item.calories.toLocaleString()} kcal</span>
                  </div>
                  <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-green-500 rounded-full"
                      style={{ 
                        width: `${(item.calories / Math.max(...cardioDistribution.map(d => d.calories))) * 100}%` 
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All time total */}
      <div className="bg-gradient-to-br from-orange-600/20 to-red-600/20 rounded-xl p-4 border border-orange-600/30 text-center">
        <div className="text-gray-400 text-sm mb-1">Total histórico</div>
        <div className="text-3xl font-bold text-orange-400">{totalAllTime.toLocaleString()}</div>
        <div className="text-gray-500 text-sm">calorías quemadas</div>
      </div>
    </div>
  );
}
