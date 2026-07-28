import { useState, useRef } from 'react';
import { CardioSession, PhysicalProfile, GpxRoute } from '../types';
import { CARDIO_TYPES } from '../data/exercises';
import { parseGpx } from '../lib/gpx';
import { generateId } from '../lib/id';
import MapRoute from './MapRoute';
import {
  Activity, Clock, Heart, Flame, Plus, Trash2, X, Check, Calendar,
  MapPin, Mountain, Upload, Map as MapIcon, ChevronDown, ChevronUp
} from 'lucide-react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { EmptyState } from './ui/EmptyState';
import { IconButton } from './ui/IconButton';
import { Sheet } from './ui/Sheet';
import { Field, TextInput } from './ui/Field';
import { useLanguage } from '../contexts/LanguageContext';
import { format } from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import { cn } from '../utils/cn';

interface CardioTabProps {
  cardioSessions: CardioSession[];
  physicalProfile: PhysicalProfile | null;
  onSaveSession: (session: CardioSession) => void;
  onDeleteSession: (sessionId: string) => void;
  estimateCalories: (cardioTypeId: string, duration: number, avgHR: number) => number;
}

const OUTDOOR_SPORTS = ['running', 'cycling', 'walking', 'hiit'];

export default function CardioTab({
  cardioSessions,
  physicalProfile,
  onSaveSession,
  onDeleteSession,
  estimateCalories,
}: CardioTabProps) {
  const { t, language } = useLanguage();
  const dateLocale = language === 'es' ? es : enUS;
  const [showForm, setShowForm] = useState(false);
  const [selectedCardio, setSelectedCardio] = useState<string>('running');
  const [duration, setDuration] = useState<number>(30);
  const [avgHeartRate, setAvgHeartRate] = useState<number>(140);
  const [notes, setNotes] = useState('');
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().split('T')[0]);
  const [gpxRoute, setGpxRoute] = useState<GpxRoute | null>(null);
  const [gpxError, setGpxError] = useState('');
  const [expandedRouteId, setExpandedRouteId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sortedSessions = [...cardioSessions].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const resetForm = () => {
    setSelectedCardio('running');
    setDuration(30);
    setAvgHeartRate(140);
    setNotes('');
    setSessionDate(new Date().toISOString().split('T')[0]);
    setGpxRoute(null);
    setGpxError('');
  };

  const handleSave = () => {
    const calories = estimateCalories(selectedCardio, duration, avgHeartRate);
    const session: CardioSession = {
      id: `cardio-${generateId()}`,
      date: new Date(sessionDate).toISOString(),
      cardioTypeId: selectedCardio,
      duration,
      averageHeartRate: avgHeartRate,
      caloriesBurned: calories,
      notes: notes || undefined,
      gpxRoute: gpxRoute || undefined,
    };
    onSaveSession(session);
    setShowForm(false);
    resetForm();
  };

  const handleGpxUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setGpxError('');

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const route = parseGpx(text);
      if (!route) {
        setGpxError(t.cardio.gpxError);
        return;
      }
      setGpxRoute(route);

      // Auto-fill duration if route has timestamps
      if (route.points.length > 1 && route.points[0].time && route.points[route.points.length - 1].time) {
        const t1 = new Date(route.points[0].time as string).getTime();
        const t2 = new Date(route.points[route.points.length - 1].time as string).getTime();
        const minutes = Math.round((t2 - t1) / 60000);
        if (minutes > 0 && minutes < 600) setDuration(minutes);
      }
    };
    reader.onerror = () => setGpxError(t.cardio.gpxError);
    reader.readAsText(file);
    e.target.value = '';
  };

  const estimatedCalories = estimateCalories(selectedCardio, duration, avgHeartRate);
  const selectedCardioType = CARDIO_TYPES.find(c => c.id === selectedCardio);
  const isOutdoorSport = OUTDOOR_SPORTS.includes(selectedCardio);

  // Weekly stats
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekSessions = cardioSessions.filter(s => new Date(s.date) >= weekAgo);
  const weeklyMinutes = weekSessions.reduce((sum, s) => sum + s.duration, 0);
  const weeklyCalories = weekSessions.reduce((sum, s) => sum + s.caloriesBurned, 0);

  const getHeartRateZone = (hr: number): { zone: string; color: string } => {
    if (!physicalProfile) return { zone: 'N/A', color: 'text-muted' };
    const { maxHeartRate, restingHeartRate } = physicalProfile;
    const hrReserve = maxHeartRate - restingHeartRate;
    const intensity = ((hr - restingHeartRate) / hrReserve) * 100;

    if (intensity < 60) return { zone: t.cardio.heartRateZones + ' 1', color: 'text-muted' };
    if (intensity < 70) return { zone: t.cardio.heartRateZones + ' 2', color: 'text-[color:var(--info)]' };
    if (intensity < 80) return { zone: t.cardio.heartRateZones + ' 3', color: 'text-[color:var(--success)]' };
    if (intensity < 90) return { zone: t.cardio.heartRateZones + ' 4', color: 'text-[color:var(--warning)]' };
    return { zone: t.cardio.heartRateZones + ' 5', color: 'text-[color:var(--danger)]' };
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-[24px] font-semibold text-primary tracking-tight">
          <Activity className="text-accent" aria-hidden="true" />
          {t.cardio.title}
        </h1>
        <Button
          variant="primary"
          size="md"
          onClick={() => setShowForm(true)}
          iconLeft={<Plus className="h-4 w-4" />}
        >
          {t.cardio.newSession}
        </Button>
      </div>

      {/* Weekly stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="glass-1 p-4">
          <div className="mb-1 flex items-center gap-2 text-[13px] text-secondary">
            <Clock size={16} aria-hidden="true" />
            {t.stats.thisWeek}
          </div>
          <div className="text-[22px] font-semibold text-primary tabular-nums tracking-tight">{weeklyMinutes} min</div>
          <div className="text-[11px] text-muted">{weekSessions.length} {t.cardio.heartRateZones && weekSessions.length === 1 ? 'sesión' : 'sesiones'}</div>
        </div>
        <div className="glass-1 p-4">
          <div className="mb-1 flex items-center gap-2 text-[13px] text-secondary">
            <Flame size={16} aria-hidden="true" className="text-accent" />
            {t.cardio.calories}
          </div>
          <div className="text-[22px] font-semibold text-accent tabular-nums tracking-tight">{weeklyCalories.toLocaleString()}</div>
          <div className="text-[11px] text-muted">kcal {t.stats.thisWeek.toLowerCase()}</div>
        </div>
      </div>

      {/* Form — bottom sheet */}
      <Sheet
        open={showForm}
        onClose={() => { setShowForm(false); resetForm(); }}
        title={t.cardio.newSession}
        footer={
          <Button
            variant="primary"
            fullWidth
            size="lg"
            onClick={handleSave}
            iconLeft={<Check className="h-4 w-4" />}
          >
            {t.cardio.logSession}
          </Button>
        }
      >
        <div className="space-y-4">
          <Field label={language === 'es' ? 'Fecha' : 'Date'}>
            {(id) => (
              <input
                id={id}
                type="date"
                value={sessionDate}
                onChange={(e) => setSessionDate(e.target.value)}
                className="block w-full rounded-[12px] border border-app bg-surface-2 px-3.5 py-3 text-[15px] text-primary focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              />
            )}
          </Field>

          <div>
            <label className="mb-2 block text-[13px] font-medium text-secondary">
              {language === 'es' ? 'Tipo de cardio' : 'Cardio type'}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {CARDIO_TYPES.map((cardio) => (
                <button
                  key={cardio.id}
                  type="button"
                  onClick={() => {
                    setSelectedCardio(cardio.id);
                    if (!OUTDOOR_SPORTS.includes(cardio.id)) setGpxRoute(null);
                  }}
                  className={cn(
                    'rounded-[14px] p-3 text-center transition-all duration-200 ease-apple',
                    'active:scale-95',
                    selectedCardio === cardio.id
                      ? 'bg-accent-soft border border-accent'
                      : 'bg-surface-2 border border-app hover:bg-surface-3',
                  )}
                >
                  <span className="mb-1 block text-2xl" aria-hidden="true">{cardio.icon}</span>
                  <span className="text-[12px] text-primary">{cardio.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* GPX Route — only outdoor sports */}
          {isOutdoorSport && (
            <div>
              <label className="mb-2 flex items-center gap-2 text-[13px] font-medium text-secondary">
                <MapIcon size={14} aria-hidden="true" /> {t.cardio.uploadGpx}
              </label>
              {!gpxRoute ? (
                <>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex w-full items-center justify-center gap-2 rounded-[14px] border-2 border-dashed border-app py-3 text-[13px] text-secondary hover:border-accent hover:text-accent hover:bg-accent-soft/40 transition-colors"
                  >
                    <Upload size={18} aria-hidden="true" />
                    {language === 'es' ? 'Cargar archivo .gpx' : 'Upload .gpx file'}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".gpx,application/gpx+xml,application/xml,text/xml"
                    onChange={handleGpxUpload}
                    className="hidden"
                  />
                  <p className="mt-1 text-[11px] text-muted">
                    {language === 'es' ? 'Sube una ruta de Strava, Garmin, Komoot, etc.' : 'Upload a route from Strava, Garmin, Komoot, etc.'}
                  </p>
                </>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between rounded-[14px] bg-surface-2 p-3 border border-app">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[14px] font-medium text-primary">
                        {gpxRoute.name || (language === 'es' ? 'Ruta sin nombre' : 'Unnamed route')}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-3 text-[11px] text-muted">
                        <span className="flex items-center gap-1">
                          <MapPin size={12} aria-hidden="true" /> {gpxRoute.distanceKm} km
                        </span>
                        {gpxRoute.elevationGain !== undefined && (
                          <span className="flex items-center gap-1">
                            <Mountain size={12} aria-hidden="true" /> +{gpxRoute.elevationGain} m
                          </span>
                        )}
                        <span>{gpxRoute.points.length} pts</span>
                      </div>
                    </div>
                    <IconButton
                      label={language === 'es' ? 'Quitar ruta' : 'Remove route'}
                      icon={<X size={16} aria-hidden="true" />}
                      variant="ghost"
                      size="sm"
                      onClick={() => setGpxRoute(null)}
                    />
                  </div>
                  <MapRoute route={gpxRoute} height={200} />
                </div>
              )}
              {gpxError && <p className="mt-1 text-[11px] text-[color:var(--danger)]">{gpxError}</p>}
            </div>
          )}

          <Field label={t.cardio.duration}>
            {(id) => (
              <TextInput
                id={id}
                type="number"
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value) || 0)}
                onFocus={(e) => e.target.select()}
                min={1}
                max={300}
                className="text-center text-[20px] font-semibold tabular-nums"
              />
            )}
          </Field>
          <div className="-mt-2 flex flex-wrap justify-center gap-2">
            {[15, 30, 45, 60, 90].map((mins) => (
              <button
                key={mins}
                type="button"
                onClick={() => setDuration(mins)}
                className={cn(
                  'rounded-full px-3 py-1 text-[12px] font-medium transition-colors',
                  duration === mins
                    ? 'bg-accent text-on-accent'
                    : 'bg-surface-2 text-secondary border border-app hover:bg-surface-3',
                )}
              >
                {mins}m
              </button>
            ))}
          </div>

          <Field label={t.cardio.avgHeartRate}>
            {(id) => (
              <TextInput
                id={id}
                type="number"
                value={avgHeartRate}
                onChange={(e) => setAvgHeartRate(parseInt(e.target.value) || 0)}
                onFocus={(e) => e.target.select()}
                min={40}
                max={220}
                className="text-center text-[20px] font-semibold tabular-nums"
              />
            )}
          </Field>
          {physicalProfile && (
            <div className="-mt-2 flex items-center justify-between text-[11px]">
              <span className="text-muted">{t.profile.restingHR}: {physicalProfile.restingHeartRate}</span>
              <span className={cn('font-semibold', getHeartRateZone(avgHeartRate).color)}>
                {getHeartRateZone(avgHeartRate).zone}
              </span>
              <span className="text-muted">{t.profile.maxHR}: {physicalProfile.maxHeartRate}</span>
            </div>
          )}

          <div className="rounded-[16px] glass-1 border border-accent/30 p-4 text-center" style={{ background: 'linear-gradient(135deg, color-mix(in srgb, var(--accent) 10%, transparent), color-mix(in srgb, var(--warning) 6%, transparent))' }}>
            <div className="text-[12px] text-muted mb-1">{t.cardio.calories}</div>
            <div className="text-[28px] font-semibold text-accent tabular-nums tracking-tight flex items-center justify-center gap-2">
              <Flame className="h-5 w-5" aria-hidden="true" />
              {estimatedCalories} kcal
            </div>
            <div className="mt-1 text-[11px] text-muted">
              {selectedCardioType?.name} · {duration} min · {avgHeartRate} bpm
            </div>
          </div>

          <Field label={t.cardio.notes}>
            {(id) => (
              <textarea
                id={id}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={language === 'es' ? '¿Cómo te sentiste?' : 'How did you feel?'}
                rows={3}
                className="block w-full rounded-[12px] border border-app bg-surface-2 px-3.5 py-2.5 text-[14px] text-primary placeholder:text-muted focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent resize-none"
              />
            )}
          </Field>
        </div>
      </Sheet>

      {/* Sessions list */}
      <div className="space-y-3">
        <h2 className="text-[14px] font-semibold text-secondary">{language === 'es' ? 'Historial' : 'History'}</h2>
        {sortedSessions.length === 0 ? (
          <EmptyState
            icon={<Activity className="h-6 w-6" />}
            title={t.cardio.noSessions}
            description={t.cardio.noSessionsDesc}
          />
        ) : (
          sortedSessions.map((session) => {
            const cardioType = CARDIO_TYPES.find(c => c.id === session.cardioTypeId);
            const hrZone = getHeartRateZone(session.averageHeartRate);
            const hasRoute = !!session.gpxRoute && session.gpxRoute.points.length > 0;
            const isExpanded = expandedRouteId === session.id;
            return (
              <Card key={session.id} level="glass1" padding="md">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <span className="text-2xl flex-shrink-0" aria-hidden="true">{cardioType?.icon || '🏃'}</span>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-[15px] font-semibold text-primary truncate">{cardioType?.name || 'Cardio'}</h3>
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-[12px] text-muted">
                        <span className="flex items-center gap-1">
                          <Calendar size={12} aria-hidden="true" />
                          {format(new Date(session.date), 'd MMM yyyy', { locale: dateLocale })}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock size={12} aria-hidden="true" />
                          {session.duration} min
                        </span>
                      </div>
                    </div>
                  </div>
                  <IconButton
                    label={t.general.delete}
                    icon={<Trash2 size={16} aria-hidden="true" />}
                    variant="ghost"
                    size="sm"
                    onClick={() => onDeleteSession(session.id)}
                  />
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-app pt-3">
                  <div className="flex items-center gap-1 text-[13px] text-primary">
                    <Heart size={14} aria-hidden="true" className="text-[color:var(--danger)]" />
                    <span className="tabular-nums">{session.averageHeartRate} bpm</span>
                    <span className={cn('text-[11px]', hrZone.color)}>({hrZone.zone})</span>
                  </div>
                  <div className="flex items-center gap-1 text-[13px] text-accent font-semibold tabular-nums">
                    <Flame size={14} aria-hidden="true" />
                    <span>{session.caloriesBurned} kcal</span>
                  </div>
                  {hasRoute && (
                    <div className="flex items-center gap-1 text-[13px] text-[color:var(--info)] tabular-nums">
                      <MapPin size={12} aria-hidden="true" />
                      <span>{session.gpxRoute!.distanceKm} km</span>
                      {session.gpxRoute!.elevationGain !== undefined && (
                        <span className="text-[11px] text-muted">+{session.gpxRoute!.elevationGain}m</span>
                      )}
                    </div>
                  )}
                </div>

                {hasRoute && (
                  <button
                    type="button"
                    onClick={() => setExpandedRouteId(isExpanded ? null : session.id)}
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-[12px] bg-surface-2 hover:bg-surface-3 py-2 text-[13px] font-medium text-primary transition-colors"
                  >
                    <MapIcon size={14} aria-hidden="true" />
                    {isExpanded ? (language === 'es' ? 'Ocultar mapa' : 'Hide map') : (language === 'es' ? 'Ver ruta en mapa' : 'View map')}
                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                )}

                {isExpanded && hasRoute && (
                  <div className="mt-3">
                    <MapRoute route={session.gpxRoute!} height={250} />
                  </div>
                )}

                {session.notes && (
                  <p className="mt-2 text-[13px] text-secondary italic">"{session.notes}"</p>
                )}
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
