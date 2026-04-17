import { useState } from 'react';
import { WorkoutTemplate, TemplateExercise, WeeklyPlan, WorkoutType } from '../types';
import { MUSCLE_LABELS, WORKOUT_TYPE_LABELS, WORKOUT_TYPE_COLORS, DAYS_OF_WEEK, DEFAULT_TEMPLATES } from '../data/exercises';
import { Plus, Trash2, Edit3, Save, X, ChevronDown, ChevronUp, Calendar, Dumbbell, RefreshCw } from 'lucide-react';

import { Search } from 'lucide-react';
import { Exercise } from '../types';

interface Props {
  templates: WorkoutTemplate[];
  weeklyPlan: WeeklyPlan;
  exercises: Exercise[];
  onSaveTemplate: (t: WorkoutTemplate) => void;
  onDeleteTemplate: (id: string) => void;
  onUpdateWeeklyPlan: (plan: WeeklyPlan) => void;
  getSuggestedSets: (exerciseId: string, numSets: number, defaultReps: number, defaultWeight: number) => { reps: number; weight: number }[];
}

function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

const WORKOUT_TYPES: WorkoutType[] = ['push', 'pull', 'legs', 'upper', 'lower', 'full', 'custom'];

export default function TemplatesTab({ templates, weeklyPlan, exercises, onSaveTemplate, onDeleteTemplate, onUpdateWeeklyPlan, getSuggestedSets }: Props) {
  const [activeSection, setActiveSection] = useState<'plan' | 'templates'>('plan');
  const [exerciseSearch, setExerciseSearch] = useState('');
  const [editingTemplate, setEditingTemplate] = useState<WorkoutTemplate | null>(null);
  const [expandedTemplate, setExpandedTemplate] = useState<string | null>(null);
  const [localPlan, setLocalPlan] = useState<WeeklyPlan>(weeklyPlan);
  const [planDirty, setPlanDirty] = useState(false);

  // Template editor state
  const [editName, setEditName] = useState('');
  const [editType, setEditType] = useState<WorkoutType>('push');
  const [editExercises, setEditExercises] = useState<TemplateExercise[]>([]);
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [targetSets, setTargetSets] = useState(14);

  const allTemplates = [...DEFAULT_TEMPLATES, ...templates.filter(t => !DEFAULT_TEMPLATES.some(d => d.id === t.id))];
  const customTemplates = templates.filter(t => !DEFAULT_TEMPLATES.some(d => d.id === t.id));

  const openCreate = () => {
    setEditingTemplate({
      id: generateId(),
      name: '',
      type: 'push',
      exercises: [],
      totalSets: 14,
    });
    setEditName('');
    setEditType('push');
    setEditExercises([]);
    setTargetSets(14);
  };

  const openEdit = (t: WorkoutTemplate) => {
    setEditingTemplate(t);
    setEditName(t.name);
    setEditType(t.type);
    setEditExercises(t.exercises.map(e => ({ ...e, sets: e.sets.map(s => ({ ...s })) })));
    setTargetSets(t.totalSets);
  };

  const handleSaveTemplate = () => {
    if (!editingTemplate || !editName.trim()) return;
    const totalSets = editExercises.reduce((sum, e) => sum + e.sets.length, 0);
    onSaveTemplate({
      ...editingTemplate,
      name: editName,
      type: editType,
      exercises: editExercises,
      totalSets,
    });
    setEditingTemplate(null);
  };

  const addExerciseToTemplate = (exerciseId: string) => {
    const numSets = Math.max(3, Math.floor(targetSets / Math.max(1, editExercises.length + 1)));
    const defaultWeight = 0;
    const defaultReps = 8;
    const suggested = getSuggestedSets(exerciseId, numSets, defaultReps, defaultWeight);
    setEditExercises(prev => [...prev, { exerciseId, sets: suggested }]);
    setShowExercisePicker(false);
  };

  const removeExerciseFromTemplate = (idx: number) => {
    setEditExercises(prev => prev.filter((_, i) => i !== idx));
  };

  const updateTemplateSet = (exIdx: number, setIdx: number, field: 'reps' | 'weight', value: number) => {
    setEditExercises(prev => prev.map((ex, i) =>
      i === exIdx ? { ...ex, sets: ex.sets.map((s, j) => j === setIdx ? { ...s, [field]: value } : s) } : ex
    ));
  };

  const addSetToTemplateExercise = (exIdx: number) => {
    setEditExercises(prev => prev.map((ex, i) => {
      if (i !== exIdx) return ex;
      const last = ex.sets[ex.sets.length - 1] || { reps: 8, weight: 0 };
      return { ...ex, sets: [...ex.sets, { reps: last.reps, weight: last.weight }] };
    }));
  };

  const removeSetFromTemplateExercise = (exIdx: number, setIdx: number) => {
    setEditExercises(prev => prev.map((ex, i) =>
      i === exIdx ? { ...ex, sets: ex.sets.filter((_, j) => j !== setIdx) } : ex
    ));
  };

  const applySmartSuggestions = () => {
    setEditExercises(prev => prev.map(ex => ({
      ...ex,
      sets: getSuggestedSets(ex.exerciseId, ex.sets.length, ex.sets[0]?.reps || 8, ex.sets[0]?.weight || 0),
    })));
  };

  // Weekly plan
  const handleDaysChange = (n: number) => {
    const days = Array.from({ length: n }, (_, i) => ({
      dayIndex: i,
      templateId: localPlan.days[i]?.templateId || null,
    }));
    setLocalPlan({ daysPerWeek: n, days });
    setPlanDirty(true);
  };

  const handleDayTemplate = (dayIndex: number, templateId: string | null) => {
    setLocalPlan(prev => ({
      ...prev,
      days: prev.days.map((d, i) => i === dayIndex ? { ...d, templateId } : d),
    }));
    setPlanDirty(true);
  };

  const handleSavePlan = () => {
    onUpdateWeeklyPlan(localPlan);
    setPlanDirty(false);
  };

  const getTemplateById = (id: string | null) => allTemplates.find(t => t.id === id) || null;

  return (
    <div className="flex flex-col h-full">
      {/* Section tabs */}
      <div className="flex bg-gray-800 border-b border-gray-700 flex-shrink-0">
        <button
          onClick={() => setActiveSection('plan')}
          className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors border-b-2 ${activeSection === 'plan' ? 'border-orange-500 text-orange-400' : 'border-transparent text-gray-400 hover:text-white'}`}
        >
          <Calendar className="w-4 h-4" /> Plan Semanal
        </button>
        <button
          onClick={() => setActiveSection('templates')}
          className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors border-b-2 ${activeSection === 'templates' ? 'border-orange-500 text-orange-400' : 'border-transparent text-gray-400 hover:text-white'}`}
        >
          <Dumbbell className="w-4 h-4" /> Plantillas
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeSection === 'plan' && (
          <div className="p-4 space-y-5">
            <div>
              <h3 className="text-white font-semibold mb-1">¿Cuántos días entrenas por semana?</h3>
              <p className="text-gray-500 text-xs mb-3">Configura tu semana y asigna un tipo de entrenamiento a cada día.</p>
              <div className="flex gap-2 flex-wrap">
                {[1, 2, 3, 4, 5, 6, 7].map(n => (
                  <button
                    key={n}
                    onClick={() => handleDaysChange(n)}
                    className={`w-10 h-10 rounded-xl font-bold text-sm transition-all ${localPlan.daysPerWeek === n ? 'bg-orange-500 text-white shadow-lg shadow-orange-900/30' : 'bg-gray-800 text-gray-400 hover:bg-gray-700 border border-gray-700'}`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              {localPlan.days.map((day, i) => {
                const template = getTemplateById(day.templateId);
                const typeColor = template ? WORKOUT_TYPE_COLORS[template.type] : '#4b5563';
                return (
                  <div key={i} className="bg-gray-800 rounded-xl border border-gray-700 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2 h-8 rounded-full"
                          style={{ backgroundColor: typeColor }}
                        />
                        <div>
                          <div className="text-white font-medium text-sm">Día {i + 1}</div>
                          <div className="text-gray-500 text-xs">{DAYS_OF_WEEK[i]}</div>
                        </div>
                      </div>
                      {template && (
                        <span
                          className="text-xs font-bold px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: typeColor + '20', color: typeColor }}
                        >
                          {WORKOUT_TYPE_LABELS[template.type]}
                        </span>
                      )}
                    </div>
                    <select
                      value={day.templateId || ''}
                      onChange={e => handleDayTemplate(i, e.target.value || null)}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500"
                    >
                      <option value="">— Sin entrenamiento (descanso) —</option>
                      {allTemplates.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                    {template && (
                      <div className="mt-2 text-xs text-gray-500">
                        {template.exercises.length} ejercicios · {template.totalSets} series totales
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {planDirty && (
              <button
                onClick={handleSavePlan}
                className="w-full py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl font-semibold hover:from-orange-600 hover:to-red-700 transition-all flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" /> Guardar plan
              </button>
            )}
          </div>
        )}

        {activeSection === 'templates' && (
          <div className="p-4 space-y-3">
            <button
              onClick={openCreate}
              className="w-full py-3 border-2 border-dashed border-gray-700 text-gray-400 rounded-xl text-sm hover:border-orange-500 hover:text-orange-400 transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" /> Nueva plantilla
            </button>

            <p className="text-gray-600 text-xs font-medium uppercase tracking-wider">Predefinidas</p>
            {DEFAULT_TEMPLATES.map(t => (
              <TemplateCard
                key={t.id}
                template={t}
                exercises={exercises}
                isExpanded={expandedTemplate === t.id}
                onToggle={() => setExpandedTemplate(expandedTemplate === t.id ? null : t.id)}
                onEdit={openEdit}
                onDelete={null}
                isDefault
              />
            ))}

            {customTemplates.length > 0 && (
              <>
                <p className="text-gray-600 text-xs font-medium uppercase tracking-wider pt-2">Personalizadas</p>
                {customTemplates.map(t => (
                  <TemplateCard
                    key={t.id}
                    template={t}
                    exercises={exercises}
                    isExpanded={expandedTemplate === t.id}
                    onToggle={() => setExpandedTemplate(expandedTemplate === t.id ? null : t.id)}
                    onEdit={openEdit}
                    onDelete={onDeleteTemplate}
                    isDefault={false}
                  />
                ))}
              </>
            )}
          </div>
        )}
      </div>

      {/* Template editor modal */}
      {editingTemplate && (
        <div className="absolute inset-0 bg-gray-900 z-20 flex flex-col">
          <div className="bg-gray-800 border-b border-gray-700 px-4 py-3 flex items-center gap-3 flex-shrink-0">
            <button onClick={() => setEditingTemplate(null)} className="text-gray-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-white font-bold flex-1">
              {customTemplates.some(t => t.id === editingTemplate.id) ? 'Editar' : 'Nueva'} plantilla
            </h2>
            <button
              onClick={handleSaveTemplate}
              disabled={!editName.trim()}
              className="px-4 py-1.5 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Guardar
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div>
              <label className="text-gray-400 text-sm mb-1 block">Nombre</label>
              <input
                type="text"
                value={editName}
                onChange={e => setEditName(e.target.value)}
                placeholder="Ej: Push Day A"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
              />
            </div>

            <div>
              <label className="text-gray-400 text-sm mb-1 block">Tipo</label>
              <div className="flex flex-wrap gap-2">
                {WORKOUT_TYPES.map(type => (
                  <button
                    key={type}
                    onClick={() => setEditType(type)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${editType === type ? 'text-white border-transparent' : 'bg-transparent text-gray-400 border-gray-700 hover:border-gray-500'}`}
                    style={editType === type ? { backgroundColor: WORKOUT_TYPE_COLORS[type] } : {}}
                  >
                    {WORKOUT_TYPE_LABELS[type]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-gray-400 text-sm mb-1 block">Series objetivo total</label>
              <input
                type="number"
                value={targetSets}
                onChange={e => setTargetSets(parseInt(e.target.value) || 14)}
                min={4}
                max={40}
                className="w-24 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-orange-500"
              />
            </div>

            {editExercises.length > 0 && (
              <button
                onClick={applySmartSuggestions}
                className="flex items-center gap-2 text-sm text-orange-400 hover:text-orange-300"
              >
                <RefreshCw className="w-4 h-4" /> Aplicar sugerencias inteligentes de carga
              </button>
            )}

            <div className="space-y-3">
              {editExercises.map((ex, exIdx) => {
                const exercise = exercises.find(e => e.id === ex.exerciseId);
                if (!exercise) return null;
                return (
                  <div key={exIdx} className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                    <div className="flex items-center gap-3 p-3">
                      <img src={exercise.imageUrl} alt={exercise.name} className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                        onError={e => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=100&q=60'; }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-white font-medium text-sm truncate">{exercise.name}</div>
                        <div className="text-gray-400 text-xs">{exercise.primaryMuscles.map(m => MUSCLE_LABELS[m]).join(', ')}</div>
                      </div>
                      <button onClick={() => removeExerciseFromTemplate(exIdx)} className="text-gray-600 hover:text-red-400">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="border-t border-gray-700 p-3 space-y-2">
                      <div className="grid grid-cols-12 gap-2 text-xs text-gray-500 px-1">
                        <div className="col-span-1">#</div>
                        <div className="col-span-5 text-center">Peso (kg)</div>
                        <div className="col-span-4 text-center">Reps</div>
                        <div className="col-span-2"></div>
                      </div>
                      {ex.sets.map((set, setIdx) => (
                        <div key={setIdx} className="grid grid-cols-12 gap-2 items-center px-1">
                          <div className="col-span-1 text-gray-500 text-sm font-bold">{setIdx + 1}</div>
                          <div className="col-span-5">
                            <input
                              type="number"
                              value={set.weight}
                              onChange={e => updateTemplateSet(exIdx, setIdx, 'weight', parseFloat(e.target.value) || 0)}
                              className="w-full text-center bg-gray-700 border border-gray-600 rounded-lg py-1.5 text-white text-sm focus:outline-none focus:border-orange-500"
                              min="0" step="0.5"
                            />
                          </div>
                          <div className="col-span-4">
                            <input
                              type="number"
                              value={set.reps}
                              onChange={e => updateTemplateSet(exIdx, setIdx, 'reps', parseInt(e.target.value) || 0)}
                              className="w-full text-center bg-gray-700 border border-gray-600 rounded-lg py-1.5 text-white text-sm focus:outline-none focus:border-orange-500"
                              min="0"
                            />
                          </div>
                          <div className="col-span-2 flex justify-center">
                            <button onClick={() => removeSetFromTemplateExercise(exIdx, setIdx)} className="text-gray-600 hover:text-red-400">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                      <button
                        onClick={() => addSetToTemplateExercise(exIdx)}
                        className="w-full py-1.5 border border-dashed border-gray-600 text-gray-500 rounded-lg text-xs hover:border-orange-500 hover:text-orange-400 flex items-center justify-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" /> Serie
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => setShowExercisePicker(true)}
              className="w-full py-3 border-2 border-dashed border-gray-700 text-gray-400 rounded-xl text-sm hover:border-orange-500 hover:text-orange-400 transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" /> Añadir ejercicio
            </button>
          </div>

          {/* Exercise picker sub-modal */}
          {showExercisePicker && (
            <div className="absolute inset-0 bg-gray-900/98 z-30 flex flex-col">
              <div className="bg-gray-800 border-b border-gray-700 p-4 flex items-center gap-3">
                <button onClick={() => { setShowExercisePicker(false); setExerciseSearch(''); }} className="text-gray-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={exerciseSearch}
                    onChange={e => setExerciseSearch(e.target.value)}
                    placeholder="Buscar ejercicio..."
                    className="w-full pl-9 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-orange-500 text-sm"
                    autoFocus
                  />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {exercises
                  .filter(ex => ex.workoutType.includes(editType) || editType === 'custom')
                  .filter(ex => ex.name.toLowerCase().includes(exerciseSearch.toLowerCase()) ||
                                ex.primaryMuscles.some(m => MUSCLE_LABELS[m]?.toLowerCase().includes(exerciseSearch.toLowerCase())))
                  .map(ex => {
                    const already = editExercises.some(e => e.exerciseId === ex.id);
                    return (
                      <button
                        key={ex.id}
                        onClick={() => !already && addExerciseToTemplate(ex.id)}
                        disabled={already}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-colors ${already ? 'border-gray-700 opacity-50 cursor-not-allowed bg-gray-800/30' : 'border-gray-700 bg-gray-800 hover:border-orange-500 hover:bg-gray-700'}`}
                      >
                        <img src={ex.imageUrl} alt={ex.name} className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                          onError={e => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=100&q=60'; }}
                        />
                        <div>
                          <div className="text-white font-medium text-sm">{ex.name}</div>
                          <div className="text-orange-400 text-xs">{ex.primaryMuscles.map(m => MUSCLE_LABELS[m]).join(', ')}</div>
                          <div className="text-gray-500 text-xs">{ex.secondaryMuscles.map(m => MUSCLE_LABELS[m]).join(' · ')}</div>
                        </div>
                      </button>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// TemplateCard component
function TemplateCard({ template, exercises, isExpanded, onToggle, onEdit, onDelete, isDefault }: {
  template: WorkoutTemplate;
  exercises: Exercise[];
  isExpanded: boolean;
  onToggle: () => void;
  onEdit: (t: WorkoutTemplate) => void;
  onDelete: ((id: string) => void) | null;
  isDefault: boolean;
}) {
  const typeColor = WORKOUT_TYPE_COLORS[template.type] || '#6b7280';
  const totalSets = template.exercises.reduce((sum, e) => sum + e.sets.length, 0);

  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
      <div className="flex items-center p-3 cursor-pointer" onClick={onToggle}>
        <div
          className="w-2 h-10 rounded-full mr-3 flex-shrink-0"
          style={{ backgroundColor: typeColor }}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-white font-semibold text-sm">{template.name}</span>
            {isDefault && (
              <span className="text-xs px-1.5 py-0.5 bg-gray-700 text-gray-400 rounded">predefinida</span>
            )}
          </div>
          <div className="text-gray-500 text-xs">{template.exercises.length} ejercicios · {totalSets} series</div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={e => { e.stopPropagation(); onEdit(template); }}
            className="p-1.5 text-gray-500 hover:text-orange-400"
          >
            <Edit3 className="w-4 h-4" />
          </button>
          {onDelete && (
            <button
              onClick={e => { e.stopPropagation(); onDelete(template.id); }}
              className="p-1.5 text-gray-500 hover:text-red-400"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-gray-700 p-3 space-y-2">
          {template.exercises.map((ex, i) => {
            const exercise = exercises.find(e => e.id === ex.exerciseId);
            if (!exercise) return null;
            return (
              <div key={i} className="flex items-center gap-3 bg-gray-700/40 rounded-lg p-2">
                <img src={exercise.imageUrl} alt={exercise.name} className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                  onError={e => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=100&q=60'; }}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-white text-sm font-medium truncate">{exercise.name}</div>
                  <div className="text-gray-400 text-xs">{ex.sets.length} series</div>
                </div>
                <div className="text-right text-xs space-y-0.5">
                  {ex.sets.slice(0, 3).map((s, j) => (
                    <div key={j} className="text-gray-400">{s.weight}kg × {s.reps}</div>
                  ))}
                  {ex.sets.length > 3 && <div className="text-gray-600">+{ex.sets.length - 3} más</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
