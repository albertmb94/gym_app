import { useState } from 'react';
import { UserDetails, UserProfile } from '../types';
import { X, User, Save } from 'lucide-react';

interface Props {
  profile: UserProfile | null;
  onUpdateDetails: (details: UserDetails) => void;
  onClose: () => void;
}

export default function ProfileModal({ profile, onUpdateDetails, onClose }: Props) {
  const [age, setAge] = useState<number>(profile?.details?.age || 25);
  const [weight, setWeight] = useState<number>(profile?.details?.weight || 70);
  const [height, setHeight] = useState<number>(profile?.details?.height || 170);
  const [gender, setGender] = useState<'male' | 'female'>(profile?.details?.gender || 'male');
  const [restingHR, setRestingHR] = useState<number>(profile?.details?.restingHR || 60);
  const [maxHR, setMaxHR] = useState<number>(profile?.details?.maxHR || 190);

  const handleSave = () => {
    onUpdateDetails({
      age,
      weight,
      height,
      gender,
      restingHR,
      maxHR,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-gray-900/95 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-800 border border-gray-700 rounded-2xl p-5 w-full max-w-sm flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-700 pb-3">
          <div className="flex items-center gap-2 text-white font-bold">
            <User className="w-5 h-5 text-orange-500" />
            <span>Perfil de Salud</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-gray-400 text-xs block mb-1">Edad</label>
              <input
                type="number"
                value={age}
                onChange={e => setAge(Math.max(1, parseInt(e.target.value) || 0))}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-orange-500 text-sm font-semibold text-center"
              />
            </div>
            <div>
              <label className="text-gray-400 text-xs block mb-1">Sexo</label>
              <select
                value={gender}
                onChange={e => setGender(e.target.value as 'male' | 'female')}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-orange-500 text-sm font-semibold"
              >
                <option value="male">Masculino</option>
                <option value="female">Femenino</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-gray-400 text-xs block mb-1">Peso (kg)</label>
              <input
                type="number"
                step="0.1"
                value={weight}
                onChange={e => setWeight(Math.max(1, parseFloat(e.target.value) || 0))}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-orange-500 text-sm font-semibold text-center"
              />
            </div>
            <div>
              <label className="text-gray-400 text-xs block mb-1">Altura (cm)</label>
              <input
                type="number"
                value={height}
                onChange={e => setHeight(Math.max(1, parseInt(e.target.value) || 0))}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-orange-500 text-sm font-semibold text-center"
              />
            </div>
          </div>

          <div>
            <label className="text-gray-400 text-xs block mb-1">Frecuencia Cardíaca Basal (bpm)</label>
            <input
              type="number"
              value={restingHR}
              onChange={e => setRestingHR(Math.max(30, parseInt(e.target.value) || 0))}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-orange-500 text-sm font-semibold text-center"
            />
          </div>

          <div>
            <label className="text-gray-400 text-xs block mb-1">Frecuencia Cardíaca Máxima (bpm)</label>
            <input
              type="number"
              value={maxHR}
              onChange={e => setMaxHR(Math.max(30, parseInt(e.target.value) || 0))}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-orange-500 text-sm font-semibold text-center"
            />
          </div>
        </div>

        {/* Footer */}
        <button
          onClick={handleSave}
          className="w-full py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:from-orange-600 hover:to-red-700 shadow-md flex-shrink-0"
        >
          <Save className="w-4 h-4" /> Guardar Perfil
        </button>
      </div>
    </div>
  );
}
