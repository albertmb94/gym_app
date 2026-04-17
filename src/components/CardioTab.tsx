import { useState, useRef } from 'react';
import { CardioSession, PhysicalProfile, GpxRoute } from '../types';
import { CARDIO_TYPES } from '../data/exercises';
import { parseGpx } from '../lib/gpx';
import MapRoute from './MapRoute';
import {
  Activity, Clock, Heart, Flame, Plus, Trash2, X, Check, Calendar,
  MapPin, Mountain, Upload, Map as MapIcon, ChevronDown, ChevronUp
} from 'lucide-react';

interface CardioTabProps {
  cardioSessions: CardioSession[];
  physicalProfile: PhysicalProfile | null;
  onSaveSession: (session: CardioSession) => void;
  onDeleteSession: (sessionId: string) => void;
  estimateCalories: (cardioTypeId: string, duration: number, avgHR: number) => number;
}

// Sports that may benefit from a GPX track
const OUTDOOR_SPORTS = ['running', 'cycling', 'walking', 'hiit'];

export default function CardioTab({
  cardioSessions,
  physicalProfile,
  onSaveSession,
  onDeleteSession,
  estimateCalories,
}: CardioTabProps) {
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
      id: `cardio-${Date.now()}`,
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
        setGpxError('No se pudo leer el archivo GPX. Verifica el formato.');
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
    reader.onerror = () => setGpxError('Error al leer el archivo');
    reader.readAsText(file);
    e.target.value = '';
  };

  const estimatedCalories = estimateCalories(selectedCardio, duration, avgHeartRate);
  const selectedCardioType = CARDIO_TYPES.find(c => c.id === selectedCardio);
  const isOutdoorSport = OUTDOOR_SPORTS.includes(selectedCardio);

  // Calculate weekly stats
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekSessions = cardioSessions.filter(s => new Date(s.date) >= weekAgo);
  const weeklyMinutes = weekSessions.reduce((sum, s) => sum + s.duration, 0);
  const weeklyCalories = weekSessions.reduce((sum, s) => sum + s.caloriesBurned, 0);

  const getHeartRateZone = (hr: number): { zone: string; color: string } => {
    if (!physicalProfile) return { zone: 'N/A', color: 'text-gray-400' };
    const { maxHeartRate, restingHeartRate } = physicalProfile;
    const hrReserve = maxHeartRate - restingHeartRate;
    const intensity = ((hr - restingHeartRate) / hrReserve) * 100;

    if (intensity < 60) return { zone: 'Zona 1', color: 'text-gray-400' };
    if (intensity < 70) return { zone: 'Zona 2', color: 'text-blue-400' };
    if (intensity < 80) return { zone: 'Zona 3', color: 'text-green-400' };
    if (intensity < 90) return { zone: 'Zona 4', color: 'text-yellow-400' };
    return { zone: 'Zona 5', color: 'text-red-400' };
  };

  return (
    <div className="p-4 pb-24">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Activity className="text-green-400" />
          Cardio
        </h2>
        <button
          onClick={() => setShowForm(true)}
          className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <Plus size={20} />
          Nueva Sesión
        </button>
      </div>

      {/* Weekly Stats */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
            <Clock size={16} />
            Esta semana
          </div>
          <div className="text-2xl font-bold">{weeklyMinutes} min</div>
          <div className="text-xs text-gray-500">{weekSessions.length} sesiones</div>
        </div>
        <div className="bg-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
            <Flame size={16} />
            Calorías quemadas
          </div>
          <div className="text-2xl font-bold text-orange-400">{weeklyCalories}</div>
          <div className="text-xs text-gray-500">kcal esta semana</div>
        </div>
      </div>

      {/* Form Modal — full-screen on mobile to avoid nav-bar overlap */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 z-[60] flex items-stretch sm:items-center justify-center sm:p-4">
          <div className="bg-gray-800 sm:rounded-xl w-full sm:max-w-md flex flex-col max-h-screen sm:max-h-[90vh]">
            {/* Header */}
            <div className="p-4 border-b border-gray-700 flex items-center justify-between flex-shrink-0">
              <h3 className="text-lg font-semibold">Nueva Sesión de Cardio</h3>
              <button
                onClick={() => { setShowForm(false); resetForm(); }}
                className="p-2 hover:bg-gray-700 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="p-4 space-y-4 overflow-y-auto flex-1">
              {/* Date */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">Fecha</label>
                <input
                  type="date"
                  value={sessionDate}
                  onChange={(e) => setSessionDate(e.target.value)}
                  className="w-full bg-gray-700 rounded-lg px-3 py-2"
                />
              </div>

              {/* Cardio Type Selection */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">Tipo de cardio</label>
                <div className="grid grid-cols-3 gap-2">
                  {CARDIO_TYPES.map((cardio) => (
                    <button
                      key={cardio.id}
                      onClick={() => {
                        setSelectedCardio(cardio.id);
                        if (!OUTDOOR_SPORTS.includes(cardio.id)) setGpxRoute(null);
                      }}
                      className={`p-3 rounded-lg text-center transition-all ${
                        selectedCardio === cardio.id
                          ? 'bg-green-600 ring-2 ring-green-400'
                          : 'bg-gray-700 hover:bg-gray-600'
                      }`}
                    >
                      <span className="text-2xl block mb-1">{cardio.icon}</span>
                      <span className="text-xs">{cardio.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* GPX Route Upload — only outdoor sports */}
              {isOutdoorSport && (
                <div>
                  <label className="block text-sm text-gray-400 mb-2 flex items-center gap-2">
                    <MapIcon size={16} /> Ruta GPX (opcional)
                  </label>
                  {!gpxRoute ? (
                    <>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full py-3 bg-gray-700 hover:bg-gray-600 rounded-lg flex items-center justify-center gap-2 text-sm border-2 border-dashed border-gray-600"
                      >
                        <Upload size={18} />
                        Cargar archivo .gpx
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".gpx,application/gpx+xml,application/xml,text/xml"
                        onChange={handleGpxUpload}
                        className="hidden"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Sube una ruta de Strava, Garmin, Komoot, etc.
                      </p>
                    </>
                  ) : (
                    <div className="space-y-2">
                      <div className="bg-gray-700 rounded-lg p-3 flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium truncate">
                            {gpxRoute.name || 'Ruta sin nombre'}
                          </div>
                          <div className="flex gap-3 text-xs text-gray-400 mt-1 flex-wrap">
                            <span className="flex items-center gap-1">
                              <MapPin size={12} /> {gpxRoute.distanceKm} km
                            </span>
                            {gpxRoute.elevationGain !== undefined && (
                              <span className="flex items-center gap-1">
                                <Mountain size={12} /> +{gpxRoute.elevationGain} m
                              </span>
                            )}
                            <span>{gpxRoute.points.length} pts</span>
                          </div>
                        </div>
                        <button
                          onClick={() => setGpxRoute(null)}
                          className="p-2 hover:bg-red-500/20 text-gray-400 hover:text-red-400 rounded ml-2"
                          title="Quitar ruta"
                        >
                          <X size={16} />
                        </button>
                      </div>
                      <MapRoute route={gpxRoute} height={200} />
                    </div>
                  )}
                  {gpxError && <p className="text-xs text-red-400 mt-1">{gpxError}</p>}
                </div>
              )}

              {/* Duration */}
              <div>
                <label className="block text-sm text-gray-400 mb-2 flex items-center gap-2">
                  <Clock size={16} />
                  Duración (minutos)
                </label>
                <input
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(parseInt(e.target.value) || 0)}
                  onFocus={(e) => e.target.select()}
                  className="w-full bg-gray-700 rounded-lg px-3 py-3 text-xl text-center"
                  min={1}
                  max={300}
                />
                <div className="flex justify-center gap-2 mt-2 flex-wrap">
                  {[15, 30, 45, 60, 90].map((mins) => (
                    <button
                      key={mins}
                      onClick={() => setDuration(mins)}
                      className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm"
                    >
                      {mins}m
                    </button>
                  ))}
                </div>
              </div>

              {/* Average Heart Rate */}
              <div>
                <label className="block text-sm text-gray-400 mb-2 flex items-center gap-2">
                  <Heart size={16} />
                  Frecuencia cardíaca media (bpm)
                </label>
                <input
                  type="number"
                  value={avgHeartRate}
                  onChange={(e) => setAvgHeartRate(parseInt(e.target.value) || 0)}
                  onFocus={(e) => e.target.select()}
                  className="w-full bg-gray-700 rounded-lg px-3 py-3 text-xl text-center"
                  min={40}
                  max={220}
                />
                {physicalProfile && (
                  <div className="flex justify-between mt-2 text-xs text-gray-400">
                    <span>Reposo: {physicalProfile.restingHeartRate}</span>
                    <span className={getHeartRateZone(avgHeartRate).color}>
                      {getHeartRateZone(avgHeartRate).zone}
                    </span>
                    <span>Max: {physicalProfile.maxHeartRate}</span>
                  </div>
                )}
              </div>

              {/* Estimated Calories */}
              <div className="bg-gray-700 rounded-lg p-4 text-center">
                <div className="text-gray-400 text-sm mb-1">Calorías estimadas</div>
                <div className="text-3xl font-bold text-orange-400 flex items-center justify-center gap-2">
                  <Flame />
                  {estimatedCalories} kcal
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {selectedCardioType?.name} • {duration} min • {avgHeartRate} bpm
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">Notas (opcional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-gray-700 rounded-lg px-3 py-2 h-20 resize-none"
                  placeholder="¿Cómo te sentiste?"
                />
              </div>
            </div>

            {/* Sticky footer with save button — always visible */}
            <div className="p-4 border-t border-gray-700 bg-gray-800 flex-shrink-0 safe-area-bottom">
              <button
                onClick={handleSave}
                className="w-full bg-green-600 hover:bg-green-700 py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
              >
                <Check size={20} />
                Guardar Sesión
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sessions List */}
      <div className="space-y-3">
        <h3 className="font-semibold text-gray-400">Historial</h3>
        {sortedSessions.length === 0 ? (
          <div className="bg-gray-800 rounded-xl p-8 text-center">
            <Activity className="mx-auto text-gray-600 mb-3" size={48} />
            <p className="text-gray-500">No hay sesiones de cardio registradas</p>
            <p className="text-gray-600 text-sm mt-1">¡Añade tu primera sesión!</p>
          </div>
        ) : (
          sortedSessions.map((session) => {
            const cardioType = CARDIO_TYPES.find(c => c.id === session.cardioTypeId);
            const hrZone = getHeartRateZone(session.averageHeartRate);
            const hasRoute = !!session.gpxRoute && session.gpxRoute.points.length > 0;
            const isExpanded = expandedRouteId === session.id;
            return (
              <div key={session.id} className="bg-gray-800 rounded-xl p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span className="text-3xl flex-shrink-0">{cardioType?.icon || '🏃'}</span>
                    <div className="min-w-0 flex-1">
                      <h4 className="font-semibold truncate">{cardioType?.name || 'Cardio'}</h4>
                      <div className="flex items-center gap-3 text-sm text-gray-400 mt-1 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Calendar size={14} />
                          {new Date(session.date).toLocaleDateString('es-ES')}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock size={14} />
                          {session.duration} min
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => onDeleteSession(session.id)}
                    className="p-2 hover:bg-red-500/20 rounded-lg text-gray-400 hover:text-red-400 flex-shrink-0"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>

                <div className="flex items-center gap-x-4 gap-y-1 mt-3 pt-3 border-t border-gray-700 flex-wrap">
                  <div className="flex items-center gap-1 text-sm">
                    <Heart size={16} className="text-red-400" />
                    <span>{session.averageHeartRate} bpm</span>
                    <span className={`text-xs ${hrZone.color}`}>({hrZone.zone})</span>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-orange-400 font-semibold">
                    <Flame size={16} />
                    <span>{session.caloriesBurned} kcal</span>
                  </div>
                  {hasRoute && (
                    <div className="flex items-center gap-1 text-sm text-green-400">
                      <MapPin size={14} />
                      <span>{session.gpxRoute!.distanceKm} km</span>
                      {session.gpxRoute!.elevationGain !== undefined && (
                        <span className="text-xs text-gray-400">+{session.gpxRoute!.elevationGain}m</span>
                      )}
                    </div>
                  )}
                </div>

                {hasRoute && (
                  <button
                    onClick={() => setExpandedRouteId(isExpanded ? null : session.id)}
                    className="mt-3 w-full flex items-center justify-center gap-2 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition-colors"
                  >
                    <MapIcon size={16} />
                    {isExpanded ? 'Ocultar mapa' : 'Ver ruta en mapa'}
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                )}

                {isExpanded && hasRoute && (
                  <div className="mt-3">
                    <MapRoute route={session.gpxRoute!} height={250} />
                  </div>
                )}

                {session.notes && (
                  <p className="text-sm text-gray-400 mt-2 italic">"{session.notes}"</p>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
