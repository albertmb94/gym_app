import { useState } from 'react';
import { MuscleGroup, WorkoutType, Exercise } from '../types';
import { MUSCLE_LABELS, WORKOUT_TYPE_LABELS, WORKOUT_TYPE_COLORS } from '../data/exercises';
import { Search, X, ChevronDown, ChevronUp, Plus, Edit2, Save } from 'lucide-react';

const ALL_MUSCLES: MuscleGroup[] = [
  'pectoral', 'triceps', 'biceps', 'shoulder', 'back', 'lats',
  'trapezius', 'core', 'quadriceps', 'hamstrings', 'glutes', 'calves', 'forearms',
];

const WORKOUT_TYPES: WorkoutType[] = ['push', 'pull', 'legs', 'upper', 'lower', 'full'];

interface Props {
  exercises: Exercise[];
  onSaveExercise: (exercise: Exercise) => void;
}

function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export default function ExercisesTab({ exercises, onSaveExercise }: Props) {
  const [search, setSearch] = useState('');
  const [selectedMuscle, setSelectedMuscle] = useState<MuscleGroup | null>(null);
  const [selectedType, setSelectedType] = useState<WorkoutType | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [editName, setEditName] = useState('');
  const [editPrimary, setEditPrimary] = useState<MuscleGroup[]>([]);
  const [editSecondary, setEditSecondary] = useState<MuscleGroup[]>([]);
  const [editWType, setEditWType] = useState<WorkoutType[]>(['custom']);
  const [editImg, setEditImg] = useState('');
  const [editDesc, setEditDesc] = useState('');

  const filtered = exercises.filter(ex => {
    const matchSearch = !search || ex.name.toLowerCase().includes(search.toLowerCase()) ||
      ex.primaryMuscles.some(m => MUSCLE_LABELS[m]?.toLowerCase().includes(search.toLowerCase()));
    const matchMuscle = !selectedMuscle ||
      ex.primaryMuscles.includes(selectedMuscle) || ex.secondaryMuscles.includes(selectedMuscle);
    const matchType = !selectedType || ex.workoutType.includes(selectedType);
    return matchSearch && matchMuscle && matchType;
  });

  const handleOpenEdit = (ex: Exercise) => {
    setEditingExercise(ex);
    setEditName(ex.name);
    setEditPrimary(ex.primaryMuscles);
    setEditSecondary(ex.secondaryMuscles);
    setEditWType(ex.workoutType);
    setEditImg(ex.imageUrl);
    setEditDesc(ex.description);
  };

  const handleOpenAdd = () => {
    setEditingExercise({
      id: generateId(),
      name: '',
      primaryMuscles: [],
      secondaryMuscles: [],
      workoutType: ['custom'],
      imageUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&q=80',
      description: '',
      isCustom: true,
    });
    setEditName('');
    setEditPrimary([]);
    setEditSecondary([]);
    setEditWType(['custom']);
    setEditImg('https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&q=80');
    setEditDesc('');
  };

  const handleSave = () => {
    if (!editingExercise || !editName.trim()) return;
    const updated: Exercise = {
      ...editingExercise,
      name: editName,
      primaryMuscles: editPrimary,
      secondaryMuscles: editSecondary,
      workoutType: editWType.length === 0 ? ['custom'] : editWType,
      imageUrl: editImg.trim() || 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&q=80',
      description: editDesc,
      isCustom: true,
    };
    onSaveExercise(updated);
    setEditingExercise(null);
  };

  const togglePrimary = (m: MuscleGroup) => {
    setEditPrimary(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]);
    setEditSecondary(prev => prev.filter(x => x !== m));
  };

  const toggleSecondary = (m: MuscleGroup) => {
    setEditSecondary(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]);
    setEditPrimary(prev => prev.filter(x => x !== m));
  };

  const toggleType = (t: WorkoutType) => {
    setEditWType(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
  };

  return (
    <div className="flex flex-col h-full relative">
      <div className="p-4 pb-0 space-y-3 flex-shrink-0">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar ejercicios..."
              className="w-full pl-9 pr-10 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 text-sm"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <button
            onClick={handleOpenAdd}
            className="p-2.5 bg-orange-600 rounded-xl text-white font-bold hover:bg-orange-700 transition-colors flex items-center justify-center"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <button
            onClick={() => setSelectedMuscle(null)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${!selectedMuscle ? 'bg-orange-600 text-white' : 'bg-gray-800 border border-gray-700 text-gray-400 hover:text-white'}`}
          >
            Todos
          </button>
          {ALL_MUSCLES.map(m => (
            <button
              key={m}
              onClick={() => setSelectedMuscle(selectedMuscle === m ? null : m)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${selectedMuscle === m ? 'bg-orange-600 text-white' : 'bg-gray-800 border border-gray-700 text-gray-400 hover:text-white'}`}
            >
              {MUSCLE_LABELS[m]}
            </button>
          ))}
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <button
            onClick={() => setSelectedType(null)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${!selectedType ? 'bg-gray-600 text-white' : 'bg-gray-800 border border-gray-700 text-gray-400'}`}
          >
            Tipos: Todos
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

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <p className="text-gray-600 text-xs font-medium">{filtered.length} ejercicio{filtered.length !== 1 ? 's' : ''}</p>

        {filtered.map(ex => {
          const isExpanded = expandedId === ex.id;
          return (
            <div key={ex.id} className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
              <div
                className="flex items-center gap-3 p-3 cursor-pointer"
                onClick={() => setExpandedId(isExpanded ? null : ex.id)}
              >
                <img
                  src={ex.imageUrl}
                  alt={ex.name}
                  className="w-14 h-14 rounded-xl object-cover flex-shrink-0 bg-gray-900"
                  onError={e => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=100&q=60'; }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-white font-semibold text-sm truncate">{ex.name}</h3>
                    {ex.isCustom && <span className="text-[10px] px-1 bg-orange-500/10 text-orange-400 rounded font-bold">Mod</span>}
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {ex.primaryMuscles.map(m => (
                      <span key={m} className="text-[10px] px-1.5 py-0.5 bg-orange-900/30 text-orange-400 rounded font-medium">
                        {MUSCLE_LABELS[m]}
                      </span>
                    ))}
                  </div>
                </div>
                <button
                  onClick={e => { e.stopPropagation(); handleOpenEdit(ex); }}
                  className="p-1.5 text-gray-500 hover:text-orange-400"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-500 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-500 flex-shrink-0" />}
              </div>

              {isExpanded && (
                <div className="border-t border-gray-700 p-4 space-y-3">
                  <p className="text-gray-300 text-sm">{ex.description || 'Sin descripción'}</p>

                  <div>
                    <p className="text-gray-500 text-xs font-medium uppercase tracking-wider mb-2">Músculos primarios</p>
                    <div className="flex flex-wrap gap-2">
                      {ex.primaryMuscles.map(m => (
                        <span key={m} className="text-xs px-2.5 py-1 bg-orange-900/20 border border-orange-800/30 text-orange-300 rounded-lg">{MUSCLE_LABELS[m]}</span>
                      ))}
                    </div>
                  </div>

                  {ex.secondaryMuscles.length > 0 && (
                    <div>
                      <p className="text-gray-500 text-xs font-medium uppercase tracking-wider mb-2">Músculos secundarios</p>
                      <div className="flex flex-wrap gap-2">
                        {ex.secondaryMuscles.map(m => (
                          <span key={m} className="text-xs px-2.5 py-1 bg-gray-700 text-gray-300 rounded-lg">{MUSCLE_LABELS[m]}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {editingExercise && (
        <div className="absolute inset-0 bg-gray-900 z-30 flex flex-col">
          <div className="bg-gray-800 border-b border-gray-700 px-4 py-3 flex items-center justify-between flex-shrink-0">
            <button onClick={() => setEditingExercise(null)} className="text-gray-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-white font-bold">{editingExercise.name ? 'Editar' : 'Nuevo'} Ejercicio</h3>
            <button
              onClick={handleSave}
              disabled={!editName.trim()}
              className="px-4 py-1.5 bg-orange-600 text-white font-bold rounded-lg text-sm disabled:opacity-40 flex items-center gap-1"
            >
              <Save className="w-4 h-4" /> Guardar
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div>
              <label className="text-gray-400 text-xs block mb-1 font-semibold">Nombre del Ejercicio</label>
              <input
                type="text"
                value={editName}
                onChange={e => setEditName(e.target.value)}
                placeholder="Ej: Curl de Bíceps"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-orange-500 text-sm font-medium"
              />
            </div>

            <div>
              <label className="text-gray-400 text-xs block mb-1">Descripción</label>
              <textarea
                value={editDesc}
                onChange={e => setEditDesc(e.target.value)}
                placeholder="Explicación del ejercicio..."
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white text-sm h-16 focus:outline-none focus:border-orange-500"
              />
            </div>

            <div>
              <label className="text-gray-400 text-xs block mb-1">Músculos Directos</label>
              <div className="flex flex-wrap gap-1.5">
                {ALL_MUSCLES.map(m => {
                  const selected = editPrimary.includes(m);
                  return (
                    <button
                      key={m}
                      onClick={() => togglePrimary(m)}
                      className={`text-xs px-2 py-1 rounded border ${selected ? 'bg-orange-600/30 text-orange-400 border-orange-500' : 'bg-gray-800 text-gray-400 border-gray-700'}`}
                    >
                      {MUSCLE_LABELS[m]}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="text-gray-400 text-xs block mb-1">Músculos Indirectos (Asistentes)</label>
              <div className="flex flex-wrap gap-1.5">
                {ALL_MUSCLES.map(m => {
                  const selected = editSecondary.includes(m);
                  return (
                    <button
                      key={m}
                      onClick={() => toggleSecondary(m)}
                      className={`text-xs px-2 py-1 rounded border ${selected ? 'bg-blue-900/30 text-blue-400 border-blue-500' : 'bg-gray-800 text-gray-400 border-gray-700'}`}
                    >
                      {MUSCLE_LABELS[m]}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="text-gray-400 text-xs block mb-1">Imagen URL</label>
              <input
                type="text"
                value={editImg}
                onChange={e => setEditImg(e.target.value)}
                placeholder="https://..."
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-orange-500 text-sm"
              />
            </div>

            <div>
              <label className="text-gray-400 text-xs block mb-1">Categorías</label>
              <div className="flex flex-wrap gap-1.5">
                {WORKOUT_TYPES.map(t => {
                  const selected = editWType.includes(t);
                  return (
                    <button
                      key={t}
                      onClick={() => toggleType(t)}
                      className={`text-xs font-bold px-2.5 py-1 rounded border ${selected ? 'text-white border-transparent' : 'border-gray-700 text-gray-400'}`}
                      style={selected ? { backgroundColor: WORKOUT_TYPE_COLORS[t] } : {}}
                    >
                      {WORKOUT_TYPE_LABELS[t]}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
