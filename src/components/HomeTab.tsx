import { useMemo, useState } from 'react';
import type { WorkoutSession, WorkoutTemplate, WeeklyPlan } from '../types';
import { WORKOUT_TYPE_COLORS } from '../data/exercises';
import { useLanguage } from '../contexts/LanguageContext';
import { format, isSameDay, startOfWeek, addDays } from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import { Play, Plus, Calendar, TrendingUp, Dumbbell, ChevronRight, Flame, AlertTriangle, Sparkles } from 'lucide-react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { EmptyState } from './ui/EmptyState';
import { Dialog } from './ui/Dialog';
import { sessionVolume } from '../utils/metrics';
import { generateId } from '../utils/id';
import { cn } from '../utils/cn';

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

function buildSessionFromTemplate(
  template: WorkoutTemplate,
  getSuggestedSets: Props['getSuggestedSets'],
): WorkoutSession {
  return {
    id: generateId('workout'),
    date: new Date().toISOString(),
    type: template.type,
    name: template.name,
    exercises: template.exercises.map((ex) => ({
      id: generateId('exlog'),
      exerciseId: ex.exerciseId,
      sets: getSuggestedSets(ex.exerciseId, ex.sets.length, ex.sets[0]?.reps || 8, ex.sets[0]?.weight || 0).map((s) => ({
        id: generateId('set'),
        reps: s.reps,
        weight: s.weight,
        completed: false,
      })),
    })),
    completed: false,
  };
}

export default function HomeTab({
  sessions,
  weeklyPlan,
  templates,
  username,
  onStartSession,
  onContinueWorkout,
  onEditSession,
  onDeleteSession,
  getSuggestedSets,
}: Props) {
  const { t, language } = useLanguage();
  const dateLocale = language === 'es' ? es : enUS;
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [draftConflict, setDraftConflict] = useState<{ draft: WorkoutSession; newSession: WorkoutSession } | null>(null);

  const today = new Date();
  const todayDayIdx = (today.getDay() + 6) % 7;
  const todayPlan = weeklyPlan.days.find((d) => d.dayIndex === todayDayIdx);
  const todayTemplate = todayPlan?.templateId ? templates.find((tt) => tt.id === todayPlan.templateId) : null;

  const weekStartDate = startOfWeek(today, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStartDate, i));
  const weekSessions = sessions.filter((s) => weekDays.some((d) => isSameDay(new Date(s.date), d)));
  const totalCompleted = sessions.filter((s) => s.completed).length;
  const weekCompletedCount = weekSessions.filter((s) => s.completed).length;
  const totalVolume = useMemo(
    () => sessions.filter((s) => s.completed).reduce((sum, s) => sum + sessionVolume(s, { excludeWarmup: true }), 0),
    [sessions],
  );

  const streak = useMemo(() => {
    const days = [...new Set(
      sessions.filter((s) => s.completed).map((s) => {
        const d = new Date(s.date);
        d.setHours(0, 0, 0, 0);
        return d.getTime();
      }),
    )].sort((a, b) => b - a);
    if (days.length === 0) return 0;
    let count = 0;
    let expected = new Date().setHours(0, 0, 0, 0);
    for (const day of days) {
      const diff = Math.round((expected - day) / (1000 * 60 * 60 * 24));
      if (diff <= 1) {
        count += 1;
        expected = day;
      } else break;
    }
    return count;
  }, [sessions]);

  const latestDraft = useMemo(
    () => [...sessions]
      .filter((s) => !s.completed)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0] || null,
    [sessions],
  );

  const recent = useMemo(
    () => [...sessions]
      .filter((s) => s.completed)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 3),
    [sessions],
  );

  function tryStartSession(newSession: WorkoutSession) {
    if (latestDraft) {
      setDraftConflict({ draft: latestDraft, newSession });
    } else {
      onStartSession(newSession);
    }
  }

  const handleStartBlank = () => {
    const session: WorkoutSession = {
      id: generateId('workout'),
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

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-primary">
            <span aria-hidden="true">👋</span> {username}
          </h1>
          <p className="text-sm text-secondary capitalize">
            {format(today, "EEEE, d 'de' MMMM", { locale: dateLocale })}
          </p>
        </div>
        {streak > 1 && (
          <div
            aria-label={`${streak} ${t.home.days}`}
            className="inline-flex items-center gap-1.5 rounded-2xl border border-orange-500/30 bg-orange-500/10 px-3 py-1.5 text-orange-300"
          >
            <Flame className="h-4 w-4" aria-hidden="true" />
            <span className="font-bold">{streak}</span>
          </div>
        )}
      </header>

      <section
        aria-label={t.home.startTraining}
        className="relative overflow-hidden rounded-3xl glass p-6 shadow-2xl"
      >
        <div aria-hidden="true" className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-orange-500/20 blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-12 -left-8 h-40 w-40 rounded-full bg-rose-500/20 blur-3xl" />
        <div className="relative">
          <p className="text-xs font-semibold uppercase tracking-wider text-orange-300">
            {t.home.startTraining}
          </p>
          <h2 className="mt-1 text-2xl font-bold text-primary">
            {todayTemplate ? todayTemplate.name : t.home.noWorkoutPlanned}
          </h2>
          {todayTemplate && (
            <p className="mt-1 text-sm text-secondary">
              {todayTemplate.exercises.length} {t.history.exercises} · {todayTemplate.totalSets} {t.history.sets}
            </p>
          )}
          <Button
            variant="primary"
            size="lg"
            fullWidth
            className="mt-4"
            onClick={() => todayTemplate ? handleStartFromTemplate(todayTemplate) : handleStartBlank()}
            iconLeft={<Play className="h-5 w-5" />}
          >
            {todayTemplate ? (language === 'es' ? '¡Empezar!' : 'Start!') : t.home.startBlank}
          </Button>
        </div>
      </section>

      {latestDraft && (
        <Card>
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 flex-shrink-0 text-amber-400" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-primary truncate">{latestDraft.name}</p>
              <p className="text-xs text-secondary">
                {language === 'es' ? 'Borrador sin completar' : 'Unfinished draft'}
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onContinueWorkout(latestDraft)}
            >
              {t.general.continue}
            </Button>
          </div>
        </Card>
      )}

      <Card>
        <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-primary">
          <Calendar className="h-4 w-4 text-orange-300" aria-hidden="true" />
          {t.home.weeklyOverview}
        </h2>
        <div role="list" className="grid grid-cols-7 gap-1">
          {weekDays.map((day, i) => {
            const dayPlan = weeklyPlan.days.find((d) => d.dayIndex === i);
            const dayTemplate = dayPlan?.templateId ? templates.find((tt) => tt.id === dayPlan.templateId) : null;
            const daySession = weekSessions.find((s) => isSameDay(new Date(s.date), day));
            const isToday = isSameDay(day, today);
            const typeColor = dayTemplate ? WORKOUT_TYPE_COLORS[dayTemplate.type] : null;
            const shortDays = (t as any).daysShort as string[] | undefined;
            return (
              <div key={i} role="listitem" className="flex flex-col items-center gap-1">
                <span className="text-xs text-muted">{shortDays?.[i] || ''}</span>
                <span
                  className={cn(
                    'grid h-9 w-9 place-items-center rounded-xl text-xs font-bold transition-all',
                    isToday && 'ring-2 ring-orange-400',
                    daySession?.completed && 'bg-emerald-500 text-white',
                    daySession && !daySession.completed && 'bg-amber-500 text-white',
                    !daySession && dayTemplate && 'text-white',
                    !daySession && !dayTemplate && 'bg-surface-3 text-muted',
                  )}
                  style={!daySession && dayTemplate && typeColor ? { backgroundColor: `${typeColor}33` } : undefined}
                >
                  {day.getDate()}
                </span>
                {dayTemplate && (
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: typeColor || 'var(--text-muted)' }}
                    aria-hidden="true"
                  />
                )}
              </div>
            );
          })}
        </div>
      </Card>

      <section aria-label={t.stats.workouts} className="grid grid-cols-3 gap-2">
        {[
          { value: weekCompletedCount, label: t.home.workoutsThisWeek },
          { value: totalCompleted, label: t.stats.workouts },
          { value: `${(totalVolume / 1000).toFixed(1)}t`, label: t.stats.totalVolume },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl glass px-3 py-3 text-center"
          >
            <p className="text-xl font-bold text-orange-300">{stat.value}</p>
            <p className="text-xs text-secondary">{stat.label}</p>
          </div>
        ))}
      </section>

      <Card>
        <h2 className="mb-3 text-base font-semibold text-primary">{t.home.quickStart}</h2>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={handleStartBlank}
            className="rounded-2xl border border-app p-3 text-left transition-colors hover:border-orange-500 hover:bg-surface-2"
          >
            <Plus className="mb-2 h-5 w-5 text-orange-300" aria-hidden="true" />
            <p className="text-sm font-semibold text-primary">{t.home.startBlank}</p>
            <p className="text-xs text-muted">{language === 'es' ? 'Desde cero' : 'From scratch'}</p>
          </button>
          <button
            type="button"
            onClick={() => setShowTemplateSelector(true)}
            className="rounded-2xl border border-app p-3 text-left transition-colors hover:border-orange-500 hover:bg-surface-2"
          >
            <TrendingUp className="mb-2 h-5 w-5 text-orange-300" aria-hidden="true" />
            <p className="text-sm font-semibold text-primary">{t.home.startFromTemplate}</p>
            <p className="text-xs text-muted">{language === 'es' ? 'Con cargas sugeridas' : 'With suggested loads'}</p>
          </button>
        </div>
      </Card>

      {recent.length > 0 && (
        <Card>
          <h2 className="mb-3 text-base font-semibold text-primary">
            {language === 'es' ? 'Últimos entrenamientos' : 'Recent workouts'}
          </h2>
          <ul className="space-y-2">
            {recent.map((s) => {
              const typeColor = WORKOUT_TYPE_COLORS[s.type] || 'var(--text-muted)';
              const vol = sessionVolume(s, { excludeWarmup: true });
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => onEditSession(s)}
                    className="flex w-full items-center gap-3 rounded-2xl border border-app p-3 text-left transition-colors hover:border-orange-500 hover:bg-surface-2"
                  >
                    <span
                      aria-hidden="true"
                      className="h-10 w-1 flex-shrink-0 rounded-full"
                      style={{ backgroundColor: typeColor }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-primary truncate">{s.name}</p>
                      <p className="text-xs text-muted">
                        {format(new Date(s.date), 'd MMM', { locale: dateLocale })} · {vol.toLocaleString()} kg
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted" aria-hidden="true" />
                  </button>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      {sessions.length === 0 && (
        <EmptyState
          icon={<Dumbbell className="h-6 w-6" />}
          title={t.home.noWorkoutPlanned}
          description={language === 'es' ? 'Empieza tu primer entrenamiento para ver estadísticas aquí.' : 'Start your first workout to see stats here.'}
          action={
            <Button variant="primary" onClick={handleStartBlank} iconLeft={<Sparkles className="h-4 w-4" />}>
              {t.home.startTraining}
            </Button>
          }
        />
      )}

      <Dialog
        open={showTemplateSelector}
        onClose={() => setShowTemplateSelector(false)}
        title={language === 'es' ? 'Elegir plantilla' : 'Choose template'}
      >
        <ul className="space-y-2">
          {templates.map((tmpl) => {
            const typeColor = WORKOUT_TYPE_COLORS[tmpl.type] || 'var(--text-muted)';
            return (
              <li key={tmpl.id}>
                <button
                  type="button"
                  onClick={() => handleStartFromTemplate(tmpl)}
                  className="flex w-full items-center gap-3 rounded-2xl border border-app p-3 text-left transition-colors hover:border-orange-500 hover:bg-surface-2"
                >
                  <span aria-hidden="true" className="h-10 w-1 flex-shrink-0 rounded-full" style={{ backgroundColor: typeColor }} />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-primary">{tmpl.name}</p>
                    <p className="text-xs text-muted">
                      {tmpl.exercises.length} {t.history.exercises} · {tmpl.totalSets} {t.history.sets}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted" aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ul>
      </Dialog>

      <Dialog
        open={draftConflict !== null}
        onClose={() => setDraftConflict(null)}
        title={language === 'es' ? 'Entrenamiento sin terminar' : 'Unfinished workout'}
        description={draftConflict ? (language === 'es'
          ? `"${draftConflict.draft.name}" está guardado como borrador. ¿Qué quieres hacer?`
          : `"${draftConflict.draft.name}" is saved as a draft. What do you want to do?`) : ''}
      >
        <div className="space-y-2">
          <Button
            variant="primary"
            fullWidth
            onClick={() => {
              if (draftConflict) {
                onContinueWorkout(draftConflict.draft);
                setDraftConflict(null);
              }
            }}
            iconLeft={<Play className="h-4 w-4" />}
          >
            {language === 'es' ? 'Continuar borrador' : 'Continue draft'}
          </Button>
          <Button
            variant="secondary"
            fullWidth
            onClick={() => {
              if (draftConflict) {
                onDeleteSession(draftConflict.draft.id);
                onStartSession(draftConflict.newSession);
                setDraftConflict(null);
              }
            }}
          >
            {language === 'es' ? 'Descartar y empezar nuevo' : 'Discard & start new'}
          </Button>
          <Button
            variant="ghost"
            fullWidth
            onClick={() => setDraftConflict(null)}
          >
            {t.general.cancel}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}