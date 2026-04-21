import { useState } from 'react';
import { Exercise, MuscleGroup, WorkoutType } from '../types';
import { EXERCISES, MUSCLE_LABELS, WORKOUT_TYPE_LABELS, WORKOUT_TYPE_COLORS, ALL_MUSCLES } from '../data/exercises';
import { Search, X, ChevronDown, ChevronUp, Edit2, Plus, Trash2, Save, Check } from 'lucide-react';

const WORKOUT_TYPES: WorkoutType[] = ['push', 'pull', 'legs', 'upper', 'lower', 'full'];

interface ExercisesTabProps {
  customExercises: Exercise[];
  onSaveExercise: (exercise: Exercise) => void;
  onUpdateExercise: (exerciseId: string, updates: Partial<Exercise>) => void;
  onDeleteExercise: (exerciseId: string) => void;
}

export default function ExercisesTab({
  customExercises,
  onSaveExercise,
  onUpdateExercise,
  onDeleteExercise,
}: ExercisesTabProps) {
  const [search, setSearch] = useState('');
  const [selectedMuscle, setSelectedMuscle] = useState<MuscleGroup | null>(null);
  const [selectedType, setSelectedType] = useState<WorkoutType | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  
  // Edit form state
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPrimaryMuscles, setEditPrimaryMuscles] = useState<MuscleGroup[]>([]);
  const [editSecondaryMuscles, setEditSecondaryMuscles] = useState<MuscleGroup[]>([]);
  const [editWorkoutTypes, setEditWorkoutTypes] = useState<WorkoutType[]>([]);
  const [editImageUrl, setEditImageUrl] = useState('');

  // Combine default and custom exercises, with custom overriding defaults
  const allExercises = [...EXERCISES];
  customExercises.forEach(custom => {
    const defaultIdx = allExercises.findIndex(e => e.id === custom.id);
    if (defaultIdx >= 0) {
      allExercises[defaultIdx] = custom;
    } else {
      allExercises.push(custom);
    }
  });

  const filtered = allExercises.filter(ex => {
    const matchSearch = !search || ex.name.toLowerCase().includes(search.toLowerCase()) ||
      ex.primaryMuscles.some(m => MUSCLE_LABELS[m]?.toLowerCase().includes(search.toLowerCase()));
    const matchMuscle = !selectedMuscle ||
      ex.primaryMuscles.includes(selectedMuscle) || ex.secondaryMuscles.includes(selectedMuscle);
    const matchType = !selectedType || ex.workoutType.includes(selectedType);
    return matchSearch && matchMuscle && matchType;
  });

  const startEditing = (ex: Exercise) => {
    setEditingId(ex.id);
    setEditName(ex.name);
    setEditDescription(ex.description);
    setEditPrimaryMuscles([...ex.primaryMuscles]);
    setEditSecondaryMuscles([...ex.secondaryMuscles]);
    setEditWorkoutTypes([...ex.workoutType]);
    setEditImageUrl(ex.imageUrl);
    setExpandedId(ex.id);
  };

  const saveEdit = () => {
    if (!editingId) return;
    const updates: Partial<Exercise> = {
      name: editName,
      description: editDescription,
      primaryMuscles: editPrimaryMuscles,
      secondaryMuscles: editSecondaryMuscles,
      workoutType: editWorkoutTypes,
      imageUrl: editImageUrl,
    };
    onUpdateExercise(editingId, updates);
    setEditingId(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const startAddNew = () => {
    setShowAddForm(true);
    setEditName('');
    setEditDescription('');
    setEditPrimaryMuscles([]);
    setEditSecondaryMuscles([]);
    setEditWorkoutTypes(['custom']);
    setEditImageUrl('');
  };

  const saveNewExercise = () => {
    if (!editName.trim()) return;
    const newExercise: Exercise = {
      id: `custom-${Date.now()}`,
      name: editName,
      description: editDescription || 'Ejercicio personalizado',
      primaryMuscles: editPrimaryMuscles,
      secondaryMuscles: editSecondaryMuscles,
      workoutType: editWorkoutTypes.length > 0 ? editWorkoutTypes : ['custom'],
      imageUrl: editImageUrl || 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&q=80',
      isCustom: true,
    };
    onSaveExercise(newExercise);
    setShowAddForm(false);
  };

  const toggleMuscle = (muscle: MuscleGroup, isPrimary: boolean) => {
    if (isPrimary) {
      if (editPrimaryMuscles.includes(muscle)) {
        setEditPrimaryMuscles(editPrimaryMuscles.filter(m => m !== muscle));
      } else {
        setEditPrimaryMuscles([...editPrimaryMuscles, muscle]);
        setEditSecondaryMuscles(editSecondaryMuscles.filter(m => m !== muscle));
      }
    } else {
      if (editSecondaryMuscles.includes(muscle)) {
        setEditSecondaryMuscles(editSecondaryMuscles.filter(m => m !== muscle));
      } else {
        setEditSecondaryMuscles([...editSecondaryMuscles, muscle]);
        setEditPrimaryMuscles(editPrimaryMuscles.filter(m => m !== muscle));
      }
    }
  };

  const toggleWorkoutType = (type: WorkoutType) => {
    if (editWorkoutTypes.includes(type)) {
      setEditWorkoutTypes(editWorkoutTypes.filter(t => t !== type));
    } else {
      setEditWorkoutTypes([...editWorkoutTypes, type]);
    }
  };

  const MuscleSelector = ({ isPrimary }: { isPrimary: boolean }) => {
    const selected = isPrimary ? editPrimaryMuscles : editSecondaryMuscles;
    return (
      <div className="flex flex-wrap gap-1">
        {(ALL_MUSCLES as MuscleGroup[]).map(m => (
          <button
            key={m}
            onClick={() => toggleMuscle(m, isPrimary)}
            className={`text-xs px-2 py-1 rounded transition-all ${
              selected.includes(m)
                ? isPrimary
                  ? 'bg-orange-600 text-white'
                  : 'bg-gray-600 text-white'
                : 'bg-gray-700 text-gray-400 hover:text-white'
            }`}
          >
            {MUSCLE_LABELS[m]}
          </button>
        ))}
      </div>
    );
  };

  const WorkoutTypeSelector = () => (
    <div className="flex flex-wrap gap-1">
      {WORKOUT_TYPES.map(t => (
        <button
          key={t}
          onClick={() => toggleWorkoutType(t)}
          className={`text-xs px-2 py-1 rounded font-bold transition-all border ${
            editWorkoutTypes.includes(t) 
              ? 'text-white border-transparent' 
              : 'bg-transparent text-gray-400 border-gray-700'
          }`}
          style={editWorkoutTypes.includes(t) ? { backgroundColor: WORKOUT_TYPE_COLORS[t] } : {}}
        >
          {WORKOUT_TYPE_LABELS[t]}
        </button>
      ))}
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="p-4 pb-0 space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar ejercicios..."
              className="w-full pl-9 pr-10 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <button
            onClick={startAddNew}
            className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-xl flex items-center gap-2"
          >
            <Plus size={18} />
            <span className="hidden sm:inline">Nuevo</span>
          </button>
        </div>

        {/* Muscle filter */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <button
            onClick={() => setSelectedMuscle(null)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${!selectedMuscle ? 'bg-orange-600 text-white' : 'bg-gray-800 border border-gray-700 text-gray-400 hover:text-white'}`}
          >
            Todos
          </button>
          {(ALL_MUSCLES as MuscleGroup[]).map(m => (
            <button
              key={m}
              onClick={() => setSelectedMuscle(selectedMuscle === m ? null : m)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${selectedMuscle === m ? 'bg-orange-600 text-white' : 'bg-gray-800 border border-gray-700 text-gray-400 hover:text-white'}`}
            >
              {MUSCLE_LABELS[m]}
            </button>
          ))}
        </div>

        {/* Type filter */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <button
            onClick={() => setSelectedType(null)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${!selectedType ? 'bg-gray-600 text-white' : 'bg-gray-800 border border-gray-700 text-gray-400'}`}
          >
            Todos
          </button>
          {WORKOUT_TYPES.map(t => (
            <button
              key={t}
              onClick={() => setSelectedType(selectedType === t ? null : t)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${selectedType === t ? 'text-white border-transparent' : 'bg-transparent text-gray-400 border-gray-700'}`}
              style={selectedType === t ? { backgroundColor: WORKOUT_TYPE_COLORS[t] } : {}}
            >
              {WORKOUT_TYPE_LABELS[t]}
            </button>
          ))}
        </div>
      </div>

      {/* Add New Exercise Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Nuevo Ejercicio</h3>
              <button onClick={() => setShowAddForm(false)} className="p-2 hover:bg-gray-700 rounded-lg">
                <X size={20} />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Nombre *</label>
                <input
                  type="text"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="w-full bg-gray-700 rounded-lg px-3 py-2"
                  placeholder="Nombre del ejercicio"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Descripción</label>
                <textarea
                  value={editDescription}
                  onChange={e => setEditDescription(e.target.value)}
                  className="w-full bg-gray-700 rounded-lg px-3 py-2 h-20 resize-none"
                  placeholder="Descripción del ejercicio"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">URL de imagen (opcional)</label>
                <input
                  type="text"
                  value={editImageUrl}
                  onChange={e => setEditImageUrl(e.target.value)}
                  className="w-full bg-gray-700 rounded-lg px-3 py-2"
                  placeholder="https://..."
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Músculos primarios</label>
                <MuscleSelector isPrimary={true} />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Músculos secundarios</label>
                <MuscleSelector isPrimary={false} />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Tipo de entrenamiento</label>
                <WorkoutTypeSelector />
              </div>

              <button
                onClick={saveNewExercise}
                disabled={!editName.trim()}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
              >
                <Check size={20} />
                Crear Ejercicio
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Exercise list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-24">
        <p className="text-gray-600 text-xs">{filtered.length} ejercicio{filtered.length !== 1 ? 's' : ''}</p>

        {filtered.map(ex => {
          const isExpanded = expandedId === ex.id;
          const isEditing = editingId === ex.id;
          const isCustom = ex.isCustom || customExercises.some(c => c.id === ex.id);

          return (
            <div key={ex.id} className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
              <div
                className="flex items-center gap-3 p-3 cursor-pointer"
                onClick={() => !isEditing && setExpandedId(isExpanded ? null : ex.id)}
              >
                <img
                  src={ex.imageUrl}
                  alt={ex.name}
                  className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
                  onError={e => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=100&q=60'; }}
                />
                <div className="flex-1 min-w-0">
                  {isEditing ? (
                    <input
                      type="text"
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      className="w-full bg-gray-700 rounded px-2 py-1 text-sm font-semibold"
                      onClick={e => e.stopPropagation()}
                    />
                  ) : (
                    <h3 className="text-white font-semibold text-sm flex items-center gap-2">
                      {ex.name}
                      {isCustom && (
                        <span className="text-xs bg-purple-600 px-2 py-0.5 rounded">Personalizado</span>
                      )}
                    </h3>
                  )}
                  <div className="flex flex-wrap gap-1 mt-1">
                    {ex.primaryMuscles.map(m => (
                      <span key={m} className="text-xs px-2 py-0.5 bg-orange-900/30 text-orange-400 rounded-full font-medium">
                        {MUSCLE_LABELS[m]}
                      </span>
                    ))}
                    {ex.secondaryMuscles.slice(0, 2).map(m => (
                      <span key={m} className="text-xs px-2 py-0.5 bg-gray-700 text-gray-400 rounded-full">
                        {MUSCLE_LABELS[m]}
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-1 mt-1">
                    {ex.workoutType.slice(0, 3).map(t => (
                      <span
                        key={t}
                        className="text-xs px-1.5 py-0.5 rounded font-bold"
                        style={{ backgroundColor: WORKOUT_TYPE_COLORS[t] + '20', color: WORKOUT_TYPE_COLORS[t] }}
                      >
                        {WORKOUT_TYPE_LABELS[t]}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isEditing) {
                        saveEdit();
                      } else {
                        startEditing(ex);
                      }
                    }}
                    className={`p-2 rounded-lg ${isEditing ? 'bg-green-600 text-white' : 'hover:bg-gray-700 text-gray-400'}`}
                  >
                    {isEditing ? <Save size={16} /> : <Edit2 size={16} />}
                  </button>
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-500 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-500 flex-shrink-0" />}
                </div>
              </div>

              {isExpanded && (
                <div className="border-t border-gray-700 p-4 space-y-3">
                  {isEditing ? (
                    <>
                      <div>
                        <label className="block text-sm text-gray-400 mb-1">Descripción</label>
                        <textarea
                          value={editDescription}
                          onChange={e => setEditDescription(e.target.value)}
                          className="w-full bg-gray-700 rounded-lg px-3 py-2 h-20 resize-none text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-sm text-gray-400 mb-1">URL de imagen</label>
                        <input
                          type="text"
                          value={editImageUrl}
                          onChange={e => setEditImageUrl(e.target.value)}
                          className="w-full bg-gray-700 rounded-lg px-3 py-2 text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-sm text-gray-400 mb-2">Músculos primarios</label>
                        <MuscleSelector isPrimary={true} />
                      </div>

                      <div>
                        <label className="block text-sm text-gray-400 mb-2">Músculos secundarios</label>
                        <MuscleSelector isPrimary={false} />
                      </div>

                      <div>
                        <label className="block text-sm text-gray-400 mb-2">Tipo de entrenamiento</label>
                        <WorkoutTypeSelector />
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={saveEdit}
                          className="flex-1 bg-green-600 hover:bg-green-700 py-2 rounded-lg font-semibold flex items-center justify-center gap-2"
                        >
                          <Save size={16} />
                          Guardar
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="flex-1 bg-gray-700 hover:bg-gray-600 py-2 rounded-lg font-semibold"
                        >
                          Cancelar
                        </button>
                      </div>

                      {isCustom && (
                        <button
                          onClick={() => {
                            onDeleteExercise(ex.id);
                            setEditingId(null);
                            setExpandedId(null);
                          }}
                          className="w-full bg-red-600/20 hover:bg-red-600/30 text-red-400 py-2 rounded-lg font-semibold flex items-center justify-center gap-2"
                        >
                          <Trash2 size={16} />
                          Eliminar ejercicio
                        </button>
                      )}
                    </>
                  ) : (
                    <>
                      <p className="text-gray-300 text-sm">{ex.description}</p>

                      <div>
                        <p className="text-gray-500 text-xs font-medium uppercase tracking-wider mb-2">Músculos primarios</p>
                        <div className="flex flex-wrap gap-2">
                          {ex.primaryMuscles.map(m => (
                            <div key={m} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-orange-900/20 border border-orange-800/30 rounded-lg">
                              <div className="w-2 h-2 rounded-full bg-orange-400" />
                              <span className="text-orange-300 text-sm font-medium">{MUSCLE_LABELS[m]}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {ex.secondaryMuscles.length > 0 && (
                        <div>
                          <p className="text-gray-500 text-xs font-medium uppercase tracking-wider mb-2">Músculos secundarios</p>
                          <div className="flex flex-wrap gap-2">
                            {ex.secondaryMuscles.map(m => (
                              <div key={m} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-700/50 border border-gray-600 rounded-lg">
                                <div className="w-2 h-2 rounded-full bg-gray-400" />
                                <span className="text-gray-300 text-sm">{MUSCLE_LABELS[m]}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div>
                        <p className="text-gray-500 text-xs font-medium uppercase tracking-wider mb-2">Tipo de entrenamiento</p>
                        <div className="flex flex-wrap gap-1.5">
                          {ex.workoutType.filter(t => t !== 'custom').map(t => (
                            <span
                              key={t}
                              className="text-xs px-2.5 py-1 rounded-lg font-bold"
                              style={{ backgroundColor: WORKOUT_TYPE_COLORS[t] + '20', color: WORKOUT_TYPE_COLORS[t], border: `1px solid ${WORKOUT_TYPE_COLORS[t]}40` }}
                            >
                              {WORKOUT_TYPE_LABELS[t]}
                            </span>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
