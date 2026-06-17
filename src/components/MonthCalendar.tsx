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

  // Per-day indicators: distinct strength workout-type colours + cardio flag
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

  // Workout types actually present this month (for a compact, relevant legend)
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
    <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
      {/* Month slider */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => setMonth(m => subMonths(m, 1))}
          className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h3 className="text-white font-semibold capitalize">
          {format(month, 'MMMM yyyy', { locale: dateLocale })}
        </h3>
        <button
          onClick={() => setMonth(m => addMonths(m, 1))}
          disabled={isSameMonth(month, new Date()) || month > new Date()}
          className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {dayLabels.map((d, i) => (
          <div key={i} className="text-center text-gray-500 text-xs font-medium">{d}</div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, i) => {
          const info = dayInfo.get(format(day, 'yyyy-MM-dd'));
          const inMonth = isSameMonth(day, month);
          const today = isToday(day);
          const types = info ? [...info.types] : [];
          const hasCardio = info?.cardio;
          return (
            <div
              key={i}
              className={`aspect-square rounded-lg flex flex-col items-center justify-center relative ${
                today ? 'ring-2 ring-orange-500' : ''
              } ${inMonth ? 'bg-gray-700/40' : 'bg-transparent'}`}
            >
              <span className={`text-xs font-medium leading-none ${inMonth ? 'text-gray-300' : 'text-gray-600'}`}>
                {day.getDate()}
              </span>
              {(types.length > 0 || hasCardio) && (
                <div className="flex items-center justify-center gap-0.5 mt-1 flex-wrap max-w-full px-0.5">
                  {types.map(ty => (
                    <span
                      key={ty}
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: WORKOUT_TYPE_COLORS[ty] || '#9ca3af' }}
                      title={WORKOUT_TYPE_LABELS[ty] || ty}
                    />
                  ))}
                  {hasCardio && (
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: CARDIO_COLOR }}
                      title={language === 'es' ? 'Cardio' : 'Cardio'}
                    />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      {(legendTypes.types.length > 0 || legendTypes.hasCardio) && (
        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-3 pt-3 border-t border-gray-700">
          {legendTypes.types.map(ty => (
            <div key={ty} className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: WORKOUT_TYPE_COLORS[ty] || '#9ca3af' }} />
              <span className="text-gray-400 text-xs">{WORKOUT_TYPE_LABELS[ty] || ty}</span>
            </div>
          ))}
          {legendTypes.hasCardio && (
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: CARDIO_COLOR }} />
              <span className="text-gray-400 text-xs flex items-center gap-1">
                <Activity className="w-3 h-3" /> Cardio
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
