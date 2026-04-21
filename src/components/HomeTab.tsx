import { useState } from 'react';
import { WorkoutSession, WorkoutTemplate, WeeklyPlan, ExerciseLog, SetLog } from '../types';
import { EXERCISES, WORKOUT_TYPE_COLORS, DEFAULT_TEMPLATES } from '../data/exercises';
import { useLanguage } from '../contexts/LanguageContext';
import { format, isSameDay, startOfWeek, addDays } from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import { Play, Plus, Calendar, TrendingUp, Dumbbell, ChevronRight, Flame, AlertTriangle } from 'lucide-react';

interface Props {
  sessions: WorkoutSession[];
  weeklyPlan: WeeklyPlan;
  templates: WorkoutTemplate[];
  username: string;
  onStartSession: (session: WorkoutSession) => void;
  onContinueWorkout: (session: WorkoutSession) => void;
  onEditSession: (session: WorkoutSession) => void;
  onDeleteSession: (id: string) => void;
  getSuggestedSets: (exerciseId: string, numSets: number, defaultReps: number, defaultWeight: number) => { reps: number; weight: number }[];
}

function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function buildSessionFromTemplate(
  template: WorkoutTemplate,
  getSuggestedSets: (exerciseId: string, numSets: number, defaultReps: number, defaultWeight: number) => { reps: number; weight: number }[]
): WorkoutSession {
  const exercises: ExerciseLog[] = template.exercises.map(ex => {
    const suggested = getSuggestedSets(ex.exerciseId, ex.sets.length, ex.sets[0]?.reps || 8, ex.sets[0]?.weight || 0);
    const sets: SetLog[] = suggested.map((s) => ({
      id: generateId(),
      reps: s.reps,
      weight: s.weight,
      completed: false,
    }));
    return { id: generateId(), exerciseId: ex.exerciseId, sets };
  });

  return {
    id: generateId(),
    date: new Date().toISOString(),
    type: template.type,
    name: template.name,
    exercises,
    completed: false,
  };
}

interface DraftConflict {
  draft: WorkoutSession;
  newSession: WorkoutSession;
}

export default function HomeTab({ sessions, weeklyPlan, templates, username, onStartSession, onEditSession, onDeleteSession, getSuggestedSets }: Props) {
  const { t, language } = useLanguage();
  const dateLocale = language === 'es' ? es : enUS;

  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [draftConflict, setDraftConflict] = useState<DraftConflict | null>(null);

  const allTemplates = [...DEFAULT_TEMPLATES, ...templates.filter(t => !DEFAULT_TEMPLATES.some(d => d.id === t.id))];

  const today = new Date();
  const todayDayIdx = (today.getDay() + 6) % 7; // Mon=0

  const todayPlan = weeklyPlan.days.find(d => d.dayIndex === todayDayIdx);
  const todayTemplate = todayPlan?.templateId ? allTemplates.find(t => t.id === todayPlan.templateId) : null;

  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const weekSessions = sessions.filter(s => weekDays.some(d => isSameDay(new Date(s.date), d)));

  const totalSessions = sessions.filter(s => s.completed).length;
  const thisWeekCount = weekSessions.filter(s => s.completed).length;
  const totalVolume = sessions.filter(s => s.completed).reduce((sum, s) =>
    sum + s.exercises.reduce((s2, ex) => s2 + ex.sets.filter(s => s.completed).reduce((s3, set) => s3 + set.reps * set.weight, 0), 0), 0
  );

  // Streak
  let streak = 0;
  const sortedCompleted = [...sessions].filter(s => s.completed).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  if (sortedCompleted.length > 0) {
    let checkDate = today;
    for (const s of sortedCompleted) {
      const sDate = new Date(s.date);
      const diffDays = Math.floor((checkDate.getTime() - sDate.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays <= 1) { streak++; checkDate = sDate; } else break;
    }
  }

  const workoutTypeLabels = t.workoutTypes as Record<string, string>;

  // --- Draft guard -------------------------------------------------------
  // Latest incomplete (draft) workout
  const latestDraft = [...sessions]
    .filter(s => !s.completed)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0] || null;

  function tryStartSession(newSession: WorkoutSession) {
    if (latestDraft) {
      setDraftConflict({ draft: latestDraft, newSession });
    } else {
      onStartSession(newSession);
    }
  }

  const handleStartBlank = () => {
    const session: WorkoutSession = {
      id: generateId(),
      date: new Date().toISOString(),
      type: 'custom',
      name: language === 'es'
        ? `Entrenamiento ${format(today, 'd MMM', { locale: dateLocale })}`
        : `Workout ${format(today, 'd MMM', { locale: dateLocale })}`,
      exercises: [],
      completed: false,
    };
    tryStartSession(session);
  };

  const handleStartFromTemplate = (template: WorkoutTemplate) => {
    const session = buildSessionFromTemplate(template, getSuggestedSets);
    tryStartSession(session);
    setShowTemplateSelector(false);
  };

  // -----------------------------------------------------------------------

  return (
    <div className="p-4 pb-24 space-y-5">
      {/* Greeting */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-white text-xl font-bold">👋 {username}</h2>
          <p className="text-gray-400 text-sm capitalize">{format(today, "EEEE, d 'de' MMMM", { locale: dateLocale })}</p>
        </div>
        {streak > 1 && (
          <div className="flex items-center gap-1 bg-orange-900/30 border border-orange-800 rounded-xl px-3 py-2">
            <Flame className="w-5 h-5 text-orange-400" />
            <span className="text-orange-400 font-bold">{streak}</span>
          </div>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-gray-800 rounded-xl p-3 border border-gray-700 text-center">
          <div className="text-xl font-bold text-orange-400">{thisWeekCount}</div>
          <div className="text-gray-500 text-xs">{t.home.workoutsThisWeek}</div>
        </div>
        <div className="bg-gray-800 rounded-xl p-3 border border-gray-700 text-center">
          <div className="text-xl font-bold text-orange-400">{totalSessions}</div>
          <div className="text-gray-500 text-xs">{t.stats.workouts}</div>
        </div>
        <div className="bg-gray-800 rounded-xl p-3 border border-gray-700 text-center">
          <div className="text-xl font-bold text-orange-400">{(totalVolume / 1000).toFixed(1)}t</div>
          <div className="text-gray-500 text-xs">{t.stats.totalVolume}</div>
        </div>
      </div>

      {/* Week calendar */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
        <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-orange-400" /> {t.home.weeklyOverview}
        </h3>
        <div className="grid grid-cols-7 gap-1">
          {weekDays.map((day, i) => {
            const dayPlan = weeklyPlan.days.find(d => d.dayIndex === i);
            const dayTemplate = dayPlan?.templateId ? allTemplates.find(t => t.id === dayPlan.templateId) : null;
            const daySession = weekSessions.find(s => isSameDay(new Date(s.date), day));
            const isToday = isSameDay(day, today);
            const typeColor = dayTemplate ? WORKOUT_TYPE_COLORS[dayTemplate.type] : null;
            const dayLabels = t.days as readonly string[];
            return (
              <div key={i} className="flex flex-col items-center gap-1">
                <span className="text-gray-500 text-xs">{(dayLabels[i] || '').slice(0, 2)}</span>
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold relative ${isToday ? 'ring-2 ring-orange-500' : ''} ${
                    daySession?.completed ? 'bg-green-600 text-white' :
                    daySession && !daySession.completed ? 'bg-yellow-700 text-white' :
                    dayTemplate ? 'text-white' : 'bg-gray-700 text-gray-500'
                  }`}
                  style={dayTemplate && !daySession ? { backgroundColor: (typeColor || '') + '40', borderColor: (typeColor || '') + '60' } : {}}
                >
                  {day.getDate()}
                  {daySession?.completed && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-400 rounded-full border border-gray-800" />
                  )}
                </div>
                {dayTemplate && <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: typeColor || '#4b5563' }} />}
              </div>
            );
          })}
        </div>
      </div>

      {/* Draft banner — if there's an unfinished workout */}
      {latestDraft && (
        <div className="bg-yellow-900/20 border border-yellow-700/40 rounded-xl p-3 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-yellow-300 text-sm font-medium truncate">{latestDraft.name}</div>
            <div className="text-yellow-600 text-xs">{language === 'es' ? 'Borrador sin completar' : 'Unfinished draft'}</div>
          </div>
          <button
            onClick={() => onEditSession(latestDraft)}
            className="flex-shrink-0 px-3 py-1.5 bg-yellow-600 hover:bg-yellow-500 text-white rounded-lg text-xs font-medium"
          >
            {t.general.continue}
          </button>
        </div>
      )}

      {/* Today's workout */}
      {todayTemplate ? (
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
          <div className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <span
                className="text-xs font-bold px-2 py-0.5 rounded-full"
                style={{ backgroundColor: WORKOUT_TYPE_COLORS[todayTemplate.type] + '30', color: WORKOUT_TYPE_COLORS[todayTemplate.type] }}
              >
                {t.home.today} · {workoutTypeLabels[todayTemplate.type] || todayTemplate.type}
              </span>
            </div>
            <h3 className="text-white font-bold text-lg">{todayTemplate.name}</h3>
            <div className="text-gray-400 text-sm mt-1">
              {todayTemplate.exercises.length} {t.history.exercises} · {todayTemplate.totalSets} {t.history.sets}
            </div>
            <div className="flex gap-2 mt-3 overflow-x-auto pb-1" style={{ touchAction: 'pan-x' }}>
              {todayTemplate.exercises.map(ex => {
                const exercise = EXERCISES.find(e => e.id === ex.exerciseId);
                if (!exercise) return null;
                return (
                  <div key={ex.exerciseId} className="flex-shrink-0 w-16">
                    <img src={exercise.imageUrl} alt={exercise.name} className="w-16 h-16 rounded-xl object-cover"
                      onError={e => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=100&q=60'; }}
                    />
                    <div className="text-gray-400 text-xs mt-1 truncate text-center">{exercise.name}</div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="px-4 pb-4">
            <button
              onClick={() => handleStartFromTemplate(todayTemplate)}
              className="w-full py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl font-bold hover:from-orange-600 hover:to-red-700 transition-all shadow-lg shadow-orange-900/30 flex items-center justify-center gap-2"
            >
              <Play className="w-5 h-5" /> {language === 'es' ? '¡Empezar!' : 'Start!'}
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-gray-800 rounded-xl border border-gray-700 border-dashed p-6 text-center">
          <Dumbbell className="w-10 h-10 text-gray-600 mx-auto mb-2" />
          <p className="text-gray-400 text-sm">{t.home.noWorkoutPlanned}</p>
        </div>
      )}

      {/* Quick start */}
      <div>
        <h3 className="text-gray-400 text-sm font-medium mb-3">{t.home.quickStart}</h3>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleStartBlank}
            className="flex items-center gap-3 p-4 bg-gray-800 rounded-xl border border-gray-700 hover:border-orange-500 transition-colors text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-gray-700 flex items-center justify-center flex-shrink-0">
              <Plus className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <div className="text-white font-medium text-sm">{language === 'es' ? 'En blanco' : 'Blank'}</div>
              <div className="text-gray-500 text-xs">{language === 'es' ? 'Desde cero' : 'From scratch'}</div>
            </div>
          </button>
          <button
            onClick={() => setShowTemplateSelector(true)}
            className="flex items-center gap-3 p-4 bg-gray-800 rounded-xl border border-gray-700 hover:border-orange-500 transition-colors text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-gray-700 flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <div className="text-white font-medium text-sm">{language === 'es' ? 'Plantilla' : 'Template'}</div>
              <div className="text-gray-500 text-xs">{language === 'es' ? 'Con cargas sugeridas' : 'With suggested loads'}</div>
            </div>
          </button>
        </div>
      </div>

      {/* Recent sessions */}
      {sessions.filter(s => s.completed).length > 0 && (
        <div>
          <h3 className="text-gray-400 text-sm font-medium mb-3">{language === 'es' ? 'Últimos entrenamientos' : 'Recent workouts'}</h3>
          <div className="space-y-2">
            {[...sessions].filter(s => s.completed).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 3).map(s => {
              const typeColor = WORKOUT_TYPE_COLORS[s.type] || '#6b7280';
              const vol = s.exercises.reduce((sum, ex) =>
                sum + ex.sets.filter(set => set.completed).reduce((s2, set) => s2 + set.reps * set.weight, 0), 0
              );
              return (
                <div key={s.id} onClick={() => onEditSession(s)}
                  className="flex items-center gap-3 p-3 bg-gray-800 rounded-xl border border-gray-700 cursor-pointer hover:border-orange-500 transition-colors"
                >
                  <div className="w-2 h-10 rounded-full flex-shrink-0" style={{ backgroundColor: typeColor }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-sm font-medium truncate">{s.name}</div>
                    <div className="text-gray-500 text-xs">{format(new Date(s.date), 'd MMM', { locale: dateLocale })} · {vol.toLocaleString()} kg vol.</div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-600 flex-shrink-0" />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Template selector modal */}
      {showTemplateSelector && (
        <div className="fixed inset-0 bg-gray-900/95 z-[60] flex flex-col">
          <div className="bg-gray-800 border-b border-gray-700 p-4 flex items-center gap-3">
            <button onClick={() => setShowTemplateSelector(false)} className="text-gray-400 hover:text-white">✕</button>
            <h2 className="text-white font-bold">{language === 'es' ? 'Elegir plantilla' : 'Choose template'}</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {allTemplates.map(tmpl => {
              const typeColor = WORKOUT_TYPE_COLORS[tmpl.type] || '#6b7280';
              return (
                <button key={tmpl.id} onClick={() => handleStartFromTemplate(tmpl)}
                  className="w-full flex items-center gap-4 p-4 bg-gray-800 rounded-xl border border-gray-700 hover:border-orange-500 transition-colors text-left"
                >
                  <div className="w-2 h-14 rounded-full flex-shrink-0" style={{ backgroundColor: typeColor }} />
                  <div className="flex-1">
                    <div className="text-white font-semibold">{tmpl.name}</div>
                    <div className="text-gray-400 text-sm">{workoutTypeLabels[tmpl.type] || tmpl.type}</div>
                    <div className="text-gray-500 text-xs mt-1">{tmpl.exercises.length} {t.history.exercises} · {tmpl.totalSets} {t.history.sets}</div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-600" />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Draft conflict modal */}
      {draftConflict && (
        <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-5 w-full max-w-sm space-y-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-yellow-400 flex-shrink-0" />
              <div>
                <h3 className="text-white font-bold">{language === 'es' ? 'Entrenamiento sin terminar' : 'Unfinished workout'}</h3>
                <p className="text-gray-400 text-sm mt-0.5">
                  {language === 'es'
                    ? `"${draftConflict.draft.name}" está guardado como borrador. ¿Qué quieres hacer?`
                    : `"${draftConflict.draft.name}" is saved as a draft. What do you want to do?`}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <button
                onClick={() => { onEditSession(draftConflict.draft); setDraftConflict(null); }}
                className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-semibold transition-colors"
              >
                {language === 'es' ? '▶ Continuar borrador' : '▶ Continue draft'}
              </button>
              <button
                onClick={() => { onDeleteSession(draftConflict.draft.id); onStartSession(draftConflict.newSession); setDraftConflict(null); }}
                className="w-full py-3 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-xl font-semibold transition-colors"
              >
                {language === 'es' ? '🗑 Descartar y empezar nuevo' : '🗑 Discard & start new'}
              </button>
              <button
                onClick={() => setDraftConflict(null)}
                className="w-full py-3 bg-transparent text-gray-500 rounded-xl font-medium hover:text-gray-300 transition-colors"
              >
                {t.general.cancel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
