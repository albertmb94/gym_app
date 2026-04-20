import { useState } from 'react';
import { PhysicalProfile, UserProfile } from '../types';
import { X, User, Save } from 'lucide-react';

interface Props {
  profile: UserProfile | null;
  onUpdateDetails: (details: PhysicalProfile) => void;
  onClose: () => void;
}

export default function ProfileModal({ profile, onUpdateDetails, onClose }: Props) {
  const phys = profile?.physicalProfile;
  const [age, setAge] = useState<number>(phys?.age || 25);
  const [weight, setWeight] = useState<number>(phys?.weight || 70);
  const [height, setHeight] = useState<number>(phys?.height || 170);
  const [sex, setSex] = useState<'male' | 'female'>(phys?.sex || 'male');
  const [restingHR, setRestingHR] = useState<number>(phys?.restingHeartRate || 60);
  const [maxHR, setMaxHR] = useState<number>(phys?.maxHeartRate || 190);

  const handleSave = () => {
    onUpdateDetails({ age, weight, height, sex, restingHeartRate: restingHR, maxHeartRate: maxHR });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-gray-900/95 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-800 border border-gray-700 rounded-2xl p-5 w-full max-w-sm flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between border-b border-gray-700 pb-3">
          <div className="flex items-center gap-2 text-white font-bold">
            <User className="w-5 h-5 text-orange-500" />
            <span>Perfil de Salud</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          <div className="space-y-3">
            <div className="bg-gray-900 p-3 rounded-xl border border-gray-700/50">
              <div className="flex justify-between items-center mb-1">
                <label className="text-gray-400 text-xs font-medium">Edad</label>
                <span className="text-orange-400 font-bold text-sm font-mono">{age} años</span>
              </div>
              <input type="range" min="12" max="100" value={age} onChange={e => setAge(parseInt(e.target.value))} className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-orange-500" />
            </div>

            <div className="bg-gray-900 p-3 rounded-xl border border-gray-700/50">
              <label className="text-gray-400 text-xs block mb-2 font-medium">Sexo</label>
              <div className="flex gap-2">
                {(['male', 'female'] as const).map(g => (
                  <button key={g} type="button" onClick={() => setSex(g)}
                    className={`flex-1 py-2 text-xs font-semibold rounded-lg border transition-all ${sex === g ? 'bg-orange-500 border-transparent text-white' : 'bg-gray-800 text-gray-400 border-gray-700'}`}>
                    {g === 'male' ? 'Masculino' : 'Femenino'}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-gray-900 p-3 rounded-xl border border-gray-700/50">
              <div className="flex justify-between items-center mb-1">
                <label className="text-gray-400 text-xs font-medium">Peso</label>
                <span className="text-orange-400 font-bold text-sm font-mono">{weight} kg</span>
              </div>
              <input type="range" min="30" max="180" step="0.5" value={weight} onChange={e => setWeight(parseFloat(e.target.value))} className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-orange-500" />
            </div>

            <div className="bg-gray-900 p-3 rounded-xl border border-gray-700/50">
              <div className="flex justify-between items-center mb-1">
                <label className="text-gray-400 text-xs font-medium">Altura</label>
                <span className="text-orange-400 font-bold text-sm font-mono">{height} cm</span>
              </div>
              <input type="range" min="110" max="230" value={height} onChange={e => setHeight(parseInt(e.target.value))} className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-orange-500" />
            </div>

            <div className="bg-gray-900 p-3 rounded-xl border border-gray-700/50">
              <div className="flex justify-between items-center mb-1">
                <label className="text-gray-400 text-xs font-medium">FC Basal</label>
                <span className="text-orange-400 font-bold text-sm font-mono">{restingHR} bpm</span>
              </div>
              <input type="range" min="35" max="120" value={restingHR} onChange={e => setRestingHR(parseInt(e.target.value))} className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-orange-500" />
            </div>

            <div className="bg-gray-900 p-3 rounded-xl border border-gray-700/50">
              <div className="flex justify-between items-center mb-1">
                <label className="text-gray-400 text-xs font-medium">FC Máxima</label>
                <span className="text-orange-400 font-bold text-sm font-mono">{maxHR} bpm</span>
              </div>
              <input type="range" min="120" max="220" value={maxHR} onChange={e => setMaxHR(parseInt(e.target.value))} className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-orange-500" />
            </div>
          </div>
        </div>

        <button onClick={handleSave} className="w-full py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:from-orange-600 hover:to-red-700 shadow-md flex-shrink-0">
          <Save className="w-4 h-4" /> Guardar Perfil
        </button>
      </div>
    </div>
  );
}
