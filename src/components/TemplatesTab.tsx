import { useState } from 'react';
import { WorkoutTemplate, TemplateExercise, WeeklyPlan, WorkoutType, Exercise } from '../types';
import { MUSCLE_LABELS, WORKOUT_TYPE_LABELS, WORKOUT_TYPE_COLORS, DAYS_OF_WEEK, DEFAULT_TEMPLATES } from '../data/exercises';
import { generateId } from '../lib/id';
import { Plus, Trash2, Edit3, Save, X, ChevronDown, ChevronUp, Calendar, Dumbbell, RefreshCw, Search } from 'lucide-react';
import NumericInput from './NumericInput';

interface Props {
  templates: WorkoutTemplate[];
  userCustomTemplates?: WorkoutTemplate[];
  weeklyPlan: WeeklyPlan;
  onSaveTemplate: (t: WorkoutTemplate) => void;
  onDeleteTemplate: (id: string) => void;
  onUpdateWeeklyPlan: (plan: WeeklyPlan) => void;
  getSuggestedSets: (exerciseId: string, numSets: number, defaultReps: number, defaultWeight: number) => { reps: number; weight: number }[];
  allExercises: Exercise[];
}

const WORKOUT_TYPES: WorkoutType[] = ['push', 'pull', 'legs', 'upper', 'lower', 'full', 'custom'];

export default function TemplatesTab({
  templates,
  userCustomTemplates = [],
  weeklyPlan,
  onSaveTemplate,
  onDeleteTemplate,
  onUpdateWeeklyPlan,
  getSuggestedSets,
  allExercises,
}: Props) {
  const [activeSection, setActiveSection] = useState<'plan' | 'templates'>('plan');
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
  const [exerciseSearch, setExerciseSearch] = useState(''); // NEW: search state

  const allTemplates = [...DEFAULT_TEMPLATES, ...templates.filter(t => !DEFAULT_TEMPLATES.some(d => d.id === t.id))];
  const customTemplates = userCustomTemplates.length > 0
    ? userCustomTemplates.filter(t => !DEFAULT_TEMPLATES.some(d => d.id === t.id))
    : templates.filter(t => !DEFAULT_TEMPLATES.some(d => d.id === t.id));

  // Helper to find exercise by ID from allExercises
  const getExerciseById = (id: string): Exercise | undefined => {
    return allExercises.find(e => e.id === id);
  };

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
    setExerciseSearch(''); // Reset search
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

  // Filter exercises for picker
  const filteredExercises = allExercises.filter(ex => {
    const matchesSearch = !exerciseSearch || 
      ex.name.toLowerCase().includes(exerciseSearch.toLowerCase()) ||
      ex.primaryMuscles.some(m => MUSCLE_LABELS[m]?.toLowerCase().includes(exerciseSearch.toLowerCase()));
    const matchesType = ex.workoutType.includes(editType) || editType === 'custom';
    return matchesSearch && matchesType;
  });

  return (
    <div className="flex flex-col h-full">
      {/* Section tabs */}
      <div className="flex bg-surface-1 border-b border-app flex-shrink-0">
        <button
          onClick={() => setActiveSection('plan')}
          className={`flex-1 py-3 text-[13px] font-medium flex items-center justify-center gap-2 transition-colors border-b-2 ${activeSection === 'plan' ? 'border-accent text-accent' : 'border-transparent text-secondary hover:text-primary'}`}
        >
          <Calendar className="w-4 h-4" /> Plan Semanal
        </button>
        <button
          onClick={() => setActiveSection('templates')}
          className={`flex-1 py-3 text-[13px] font-medium flex items-center justify-center gap-2 transition-colors border-b-2 ${activeSection === 'templates' ? 'border-accent text-accent' : 'border-transparent text-secondary hover:text-primary'}`}
        >
          <Dumbbell className="w-4 h-4" /> Plantillas
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeSection === 'plan' && (
          <div className="p-4 pb-24 space-y-5">
            <div>
              <h3 className="text-[15px] font-semibold text-primary tracking-tight mb-1">¿Cuántos días entrenas por semana?</h3>
              <p className="text-[12px] text-muted mb-3">Configura tu semana y asigna un tipo de entrenamiento a cada día.</p>
              <div className="flex gap-2 flex-wrap">
                {[1, 2, 3, 4, 5, 6, 7].map(n => (
                  <button
                    key={n}
                    onClick={() => handleDaysChange(n)}
                    className={`h-10 w-10 rounded-[12px] font-semibold text-[14px] transition-all ${localPlan.daysPerWeek === n ? 'bg-accent text-on-accent shadow-[0_4px_14px_-4px_color-mix(in_srgb,var(--accent)_60%,transparent)]' : 'bg-surface-2 text-secondary hover:bg-surface-3 border border-app'}`}
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
                  <div key={i} className="glass-1 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2 h-8 rounded-full"
                          style={{ backgroundColor: typeColor }}
                        />
                        <div>
                          <div className="text-[14px] font-semibold text-primary">Día {i + 1}</div>
                          <div className="text-[11px] text-muted">{DAYS_OF_WEEK[i]}</div>
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
                      className="w-full bg-surface-2 border border-app rounded-[10px] px-3 py-2 text-[13px] text-primary focus-visible:outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent"
                    >
                      <option value="">— Sin entrenamiento (descanso) —</option>
                      {allTemplates.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                    {template && (
                      <div className="mt-2 text-[11px] text-muted">
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
                className="w-full py-3 rounded-[14px] font-semibold transition-all flex items-center justify-center gap-2 bg-accent text-on-accent hover:opacity-90 active:scale-[0.98]"
              >
                <Save className="w-4 h-4" /> Guardar plan
              </button>
            )}
          </div>
        )}

        {activeSection === 'templates' && (
          <div className="p-4 pb-24 space-y-3">
            <button
              onClick={openCreate}
              className="w-full py-3 border-2 border-dashed border-app text-secondary rounded-[14px] text-[13px] hover:border-accent hover:text-accent transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" /> Nueva plantilla
            </button>

            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Predefinidas</p>
            {DEFAULT_TEMPLATES.map(t => (
              <TemplateCard
                key={t.id}
                template={t}
                isExpanded={expandedTemplate === t.id}
                onToggle={() => setExpandedTemplate(expandedTemplate === t.id ? null : t.id)}
                onEdit={openEdit}
                onDelete={null}
                isDefault
                allExercises={allExercises}
              />
            ))}

            {customTemplates.length > 0 && (
              <>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted pt-2">Personalizadas</p>
                {customTemplates.map(t => (
                  <TemplateCard
                    key={t.id}
                    template={t}
                    isExpanded={expandedTemplate === t.id}
                    onToggle={() => setExpandedTemplate(expandedTemplate === t.id ? null : t.id)}
                    onEdit={openEdit}
                    onDelete={onDeleteTemplate}
                    isDefault={false}
                    allExercises={allExercises}
                  />
                ))}
              </>
            )}
          </div>
        )}
      </div>

      {/* Template editor modal */}
      {editingTemplate && (
        <div className="fixed inset-0 bg-canvas z-[60] flex flex-col">
          <div className="bg-surface-1 border-b border-app px-4 py-3 flex items-center gap-3 flex-shrink-0">
            <button onClick={() => setEditingTemplate(null)} className="text-secondary hover:text-primary">
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-primary font-semibold flex-1 tracking-tight">
              {customTemplates.some(t => t.id === editingTemplate.id) ? 'Editar' : 'Nueva'} plantilla
            </h2>
            <button
              onClick={handleSaveTemplate}
              disabled={!editName.trim()}
              className="px-4 py-1.5 bg-accent text-on-accent rounded-[10px] text-[13px] font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Guardar
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div>
              <label className="text-[13px] text-secondary mb-1 block">Nombre</label>
              <input
                type="text"
                value={editName}
                onChange={e => setEditName(e.target.value)}
                placeholder="Ej: Push Day A"
                className="w-full bg-surface-2 border border-app rounded-[12px] px-3 py-2.5 text-primary placeholder:text-muted focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              />
            </div>

            <div>
              <label className="text-[13px] text-secondary mb-1 block">Tipo</label>
              <div className="flex flex-wrap gap-2">
                {WORKOUT_TYPES.map(type => (
                  <button
                    key={type}
                    onClick={() => setEditType(type)}
                    className={`px-3 py-1.5 rounded-[10px] text-[11px] font-semibold transition-all border ${editType === type ? 'text-white border-transparent' : 'bg-transparent text-secondary border-app hover:border-app-strong'}`}
                    style={editType === type ? { backgroundColor: WORKOUT_TYPE_COLORS[type] } : {}}
                  >
                    {WORKOUT_TYPE_LABELS[type]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[13px] text-secondary mb-1 block">Series objetivo total</label>
              <NumericInput
                value={targetSets}
                onChange={(v) => setTargetSets(v)}
                min={4}
                max={40}
                fallbackOnEmpty={14}
                className="w-24 bg-surface-2 border border-app rounded-[12px] px-3 py-2 text-[14px] text-primary focus-visible:outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent"
              />
            </div>

            {editExercises.length > 0 && (
              <button
                onClick={applySmartSuggestions}
                className="flex items-center gap-2 text-[13px] text-accent hover:opacity-80"
              >
                <RefreshCw className="w-4 h-4" /> Aplicar sugerencias inteligentes de carga
              </button>
            )}

            <div className="space-y-3">
              {editExercises.map((ex, exIdx) => {
                const exercise = getExerciseById(ex.exerciseId);
                if (!exercise) return null;
                return (
                  <div key={exIdx} className="glass-1 overflow-hidden">
                    <div className="flex items-center gap-3 p-3">
                      <img src={exercise.imageUrl} alt={exercise.name} className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                        onError={e => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=100&q=60'; }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-[14px] font-medium text-primary truncate">{exercise.name}</div>
                        <div className="text-[11px] text-secondary">{exercise.primaryMuscles.map(m => MUSCLE_LABELS[m]).join(', ')}</div>
                      </div>
                      <button onClick={() => removeExerciseFromTemplate(exIdx)} className="text-muted hover:text-[color:var(--danger)]">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="border-t border-app p-3 space-y-2">
                      <div className="grid grid-cols-12 gap-2 text-[10px] text-muted px-1 font-semibold uppercase tracking-wider">
                        <div className="col-span-1">#</div>
                        <div className="col-span-5 text-center">Peso (kg)</div>
                        <div className="col-span-4 text-center">Reps</div>
                        <div className="col-span-2"></div>
                      </div>
                      {ex.sets.map((set, setIdx) => (
                        <div key={setIdx} className="grid grid-cols-12 gap-2 items-center px-1">
                          <div className="col-span-1 text-muted text-[12px] font-semibold text-center">{setIdx + 1}</div>
                          <div className="col-span-5">
                            <NumericInput
                              value={set.weight}
                              onChange={(v) => updateTemplateSet(exIdx, setIdx, 'weight', v)}
                              decimals
                              min={0}
                              step={0.5}
                              fallbackOnEmpty={0}
                              className="w-full text-center bg-surface-2 border border-app rounded-[10px] py-1.5 text-[13px] text-primary focus-visible:outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent"
                            />
                          </div>
                          <div className="col-span-4">
                            <NumericInput
                              value={set.reps}
                              onChange={(v) => updateTemplateSet(exIdx, setIdx, 'reps', v)}
                              min={0}
                              fallbackOnEmpty={8}
                              className="w-full text-center bg-surface-2 border border-app rounded-[10px] py-1.5 text-[13px] text-primary focus-visible:outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent"
                            />
                          </div>
                          <div className="col-span-2 flex justify-center">
                            <button onClick={() => removeSetFromTemplateExercise(exIdx, setIdx)} className="text-muted hover:text-[color:var(--danger)]">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                      <button
                        onClick={() => addSetToTemplateExercise(exIdx)}
                        className="w-full py-1.5 border border-dashed border-app text-muted rounded-[10px] text-[12px] hover:border-accent hover:text-accent flex items-center justify-center gap-1"
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
              className="w-full py-3 border-2 border-dashed border-app text-secondary rounded-[14px] text-[13px] hover:border-accent hover:text-accent transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" /> Añadir ejercicio
            </button>
          </div>

          {/* Exercise picker sub-modal with search */}
          {showExercisePicker && (
            <div className="fixed inset-0 bg-canvas z-[70] flex flex-col">
              <div className="bg-surface-1 border-b border-app p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <button onClick={() => { setShowExercisePicker(false); setExerciseSearch(''); }} className="text-secondary hover:text-primary">
                    <X className="w-5 h-5" />
                  </button>
                  <h3 className="text-white font-medium">Seleccionar ejercicio</h3>
                </div>
                {/* Search input */}
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                  <input
                    type="text"
                    value={exerciseSearch}
                    onChange={e => setExerciseSearch(e.target.value)}
                    placeholder="Buscar por nombre o músculo..."
                    className="w-full bg-surface-2 border border-app rounded-[10px] pl-10 pr-4 py-2.5 text-[14px] text-primary placeholder:text-muted focus-visible:outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent"
                    autoFocus
                  />
                  {exerciseSearch && (
                    <button
                      onClick={() => setExerciseSearch('')}
                      className="absolute right-3 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-primary"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {filteredExercises.length === 0 ? (
                  <div className="py-8 text-center text-[13px] text-muted">
                    No se encontraron ejercicios
                  </div>
                ) : (
                  filteredExercises.map(ex => {
                    const already = editExercises.some(e => e.exerciseId === ex.id);
                    return (
                      <button
                        key={ex.id}
                        onClick={() => !already && addExerciseToTemplate(ex.id)}
                        disabled={already}
                        className={`w-full flex items-center gap-3 p-3 rounded-[14px] border text-left transition-colors ${already ? 'border-app opacity-50 cursor-not-allowed bg-surface-2/30' : 'border-app bg-surface-2 hover:border-accent hover:bg-surface-3'}`}
                      >
                        <img src={ex.imageUrl} alt={ex.name} className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                          onError={e => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=100&q=60'; }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-white font-medium text-sm flex items-center gap-2">
                            {ex.name}
                            {ex.isCustom && (
                              <span className="text-xs px-1.5 py-0.5 bg-purple-600/30 text-purple-400 rounded">
                                Personalizado
                              </span>
                            )}
                          </div>
                          <div className="text-accent text-[11px]">{ex.primaryMuscles.map(m => MUSCLE_LABELS[m]).join(', ')}</div>
                          <div className="text-[11px] text-muted">{ex.secondaryMuscles.map(m => MUSCLE_LABELS[m]).join(' · ')}</div>
                        </div>
                        {already && (
                          <span className="text-[11px] text-muted">Añadido</span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// TemplateCard component
function TemplateCard({ template, isExpanded, onToggle, onEdit, onDelete, isDefault, allExercises }: {
  template: WorkoutTemplate;
  isExpanded: boolean;
  onToggle: () => void;
  onEdit: (t: WorkoutTemplate) => void;
  onDelete: ((id: string) => void) | null;
  isDefault: boolean;
  allExercises: Exercise[];
}) {
  const typeColor = WORKOUT_TYPE_COLORS[template.type] || '#6b7280';
  const totalSets = template.exercises.reduce((sum, e) => sum + e.sets.length, 0);

  const getExerciseById = (id: string): Exercise | undefined => {
    return allExercises.find(e => e.id === id);
  };

  return (
    <div className="glass-1 overflow-hidden">
      <div className="flex items-center p-3 cursor-pointer" onClick={onToggle}>
        <div
          className="w-2 h-10 rounded-full mr-3 flex-shrink-0"
          style={{ backgroundColor: typeColor }}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-white font-semibold text-sm">{template.name}</span>
            {isDefault && (
              <span className="rounded-full bg-surface-3 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-secondary">predefinida</span>
            )}
          </div>
          <div className="text-[11px] text-muted">{template.exercises.length} ejercicios · {totalSets} series</div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={e => { e.stopPropagation(); onEdit(template); }}
            className="p-1.5 text-muted hover:text-accent"
          >
            <Edit3 className="w-4 h-4" />
          </button>
          {onDelete && (
            <button
              onClick={e => { e.stopPropagation(); onDelete(template.id); }}
              className="p-1.5 text-muted hover:text-[color:var(--danger)]"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          {isExpanded ? <ChevronUp className="h-4 w-4 text-muted" /> : <ChevronDown className="h-4 w-4 text-muted" />}
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-app p-3 space-y-2">
          {template.exercises.map((ex, i) => {
            const exercise = getExerciseById(ex.exerciseId);
            if (!exercise) return null;
            return (
              <div key={i} className="flex items-center gap-3 bg-surface-2 rounded-[10px] p-2">
                <img src={exercise.imageUrl} alt={exercise.name} className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                  onError={e => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=100&q=60'; }}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-white text-sm font-medium truncate">{exercise.name}</div>
                  <div className="text-[11px] text-secondary">{ex.sets.length} series</div>
                </div>
                <div className="text-right text-xs space-y-0.5">
                  {ex.sets.slice(0, 3).map((s, j) => (
                    <div key={j} className="text-secondary tabular-nums">{s.weight}kg × {s.reps}</div>
                  ))}
                  {ex.sets.length > 3 && <div className="text-muted text-[11px]">+{ex.sets.length - 3} más</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
