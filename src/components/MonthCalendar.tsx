import { useState, useMemo } from 'react';
import { WorkoutSession, CardioSession } from '../types';
import { WORKOUT_TYPE_COLORS, WORKOUT_TYPE_LABELS } from '../data/exercises';
import { useLanguage } from '../contexts/LanguageContext';
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, addMonths, subMonths, isToday,
} from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Activity } from 'lucide-react';
import { IconButton } from './ui/IconButton';
import { cn } from '../utils/cn';

interface Props {
  sessions: WorkoutSession[];
  cardioSessions: CardioSession[];
}

const CARDIO_COLOR = '#06b6d4'; // cyan — distinct from all strength type colours

export default function MonthCalendar({ sessions, cardioSessions }: Props) {
  const { t, language } = useLanguage();
  const dateLocale = language === 'es' ? es : enUS;
  const [month, setMonth] = useState(() => startOfMonth(new Date()));

  const days = useMemo(() => {
    const gridStart = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
    const gridEnd = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
    return eachDayOfInterval({ start: gridStart, end: gridEnd });
  }, [month]);

  const dayInfo = useMemo(() => {
    const map = new Map<string, { types: Set<string>; cardio: boolean }>();
    const key = (d: Date) => format(d, 'yyyy-MM-dd');

    sessions.filter(s => s.completed).forEach(s => {
      const k = key(new Date(s.date));
      const entry = map.get(k) || { types: new Set<string>(), cardio: false };
      entry.types.add(s.type);
      map.set(k, entry);
    });
    cardioSessions.forEach(s => {
      const k = key(new Date(s.date));
      const entry = map.get(k) || { types: new Set<string>(), cardio: false };
      entry.cardio = true;
      map.set(k, entry);
    });
    return map;
  }, [sessions, cardioSessions]);

  const dayLabels = (t.days as readonly string[]).map(d => d.slice(0, 1));

  const legendTypes = useMemo(() => {
    const present = new Set<string>();
    let hasCardio = false;
    days.filter(d => isSameMonth(d, month)).forEach(d => {
      const info = dayInfo.get(format(d, 'yyyy-MM-dd'));
      if (!info) return;
      info.types.forEach(ti => present.add(ti));
      if (info.cardio) hasCardio = true;
    });
    return { types: [...present], hasCardio };
  }, [days, month, dayInfo]);

  return (
    <div className="glass-1 p-4">
      <div className="mb-3 flex items-center justify-between">
        <IconButton
          label={language === 'es' ? 'Mes anterior' : 'Previous month'}
          icon={<ChevronLeft className="h-5 w-5" aria-hidden="true" />}
          onClick={() => setMonth(m => subMonths(m, 1))}
          variant="ghost"
          size="sm"
        />
        <h3 className="text-[15px] font-semibold text-primary tracking-tight capitalize">
          {format(month, 'MMMM yyyy', { locale: dateLocale })}
        </h3>
        <IconButton
          label={language === 'es' ? 'Mes siguiente' : 'Next month'}
          icon={<ChevronRight className="h-5 w-5" aria-hidden="true" />}
          onClick={() => setMonth(m => addMonths(m, 1))}
          variant="ghost"
          size="sm"
          disabled={isSameMonth(month, new Date()) || month > new Date()}
        />
      </div>

      <div className="mb-1 grid grid-cols-7 gap-1.5">
        {dayLabels.map((d, i) => (
          <div key={i} className="text-center text-[11px] font-semibold text-muted">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {days.map((day, i) => {
          const info = dayInfo.get(format(day, 'yyyy-MM-dd'));
          const inMonth = isSameMonth(day, month);
          const today = isToday(day);
          const types = info ? [...info.types] : [];
          const hasCardio = info?.cardio;
          return (
            <div
              key={i}
              className={cn(
                'relative flex aspect-square flex-col items-center justify-center rounded-[10px]',
                'transition-colors duration-200 ease-apple',
                today && 'ring-2 ring-accent',
                inMonth
                  ? 'bg-surface-2 border border-app'
                  : 'bg-transparent',
              )}
            >
              <span className={cn(
                'text-[12px] font-medium tabular-nums leading-none',
                inMonth ? 'text-primary' : 'text-disabled',
              )}>
                {day.getDate()}
              </span>
              {(types.length > 0 || hasCardio) && (
                <div className="mt-1 flex flex-wrap items-center justify-center gap-0.5 max-w-full px-0.5">
                  {types.map(ty => (
                    <span
                      key={ty}
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: WORKOUT_TYPE_COLORS[ty] || '#9ca3af' }}
                      title={WORKOUT_TYPE_LABELS[ty] || ty}
                    />
                  ))}
                  {hasCardio && (
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: CARDIO_COLOR }}
                      title="Cardio"
                    />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {(legendTypes.types.length > 0 || legendTypes.hasCardio) && (
        <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 border-t border-app pt-3">
          {legendTypes.types.map(ty => (
            <div key={ty} className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: WORKOUT_TYPE_COLORS[ty] || '#9ca3af' }} />
              <span className="text-[11px] text-muted">{WORKOUT_TYPE_LABELS[ty] || ty}</span>
            </div>
          ))}
          {legendTypes.hasCardio && (
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: CARDIO_COLOR }} />
              <span className="text-[11px] text-muted flex items-center gap-1">
                <Activity className="h-3 w-3" /> Cardio
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
