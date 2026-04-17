import { useState, useEffect } from 'react';
import { PhysicalProfile } from '../types';
import { User, Ruler, Weight, Heart, Activity, Calendar, Save, Check, Download, Upload } from 'lucide-react';
import WheelPicker from './WheelPicker';

interface ProfileTabProps {
  physicalProfile: PhysicalProfile | null;
  onSaveProfile: (profile: PhysicalProfile) => void;
  username: string;
  onLogout: () => void;
  onExportData: () => void;
  onImportData: (data: string) => boolean;
}

export default function ProfileTab({ 
  physicalProfile, 
  onSaveProfile, 
  username, 
  onLogout,
  onExportData,
  onImportData,
}: ProfileTabProps) {
  const [profile, setProfile] = useState<PhysicalProfile>({
    height: physicalProfile?.height || 170,
    weight: physicalProfile?.weight || 70,
    age: physicalProfile?.age || 30,
    sex: physicalProfile?.sex || 'male',
    restingHeartRate: physicalProfile?.restingHeartRate || 60,
    maxHeartRate: physicalProfile?.maxHeartRate || 190,
  });
  const [saved, setSaved] = useState(false);
  const [importError, setImportError] = useState('');
  const [importSuccess, setImportSuccess] = useState(false);

  useEffect(() => {
    if (physicalProfile) {
      setProfile(physicalProfile);
    }
  }, [physicalProfile]);

  const handleSave = () => {
    onSaveProfile(profile);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const calculateBMI = () => {
    const heightM = profile.height / 100;
    return (profile.weight / (heightM * heightM)).toFixed(1);
  };

  const getBMICategory = (bmi: number) => {
    if (bmi < 18.5) return { text: 'Bajo peso', color: 'text-yellow-400' };
    if (bmi < 25) return { text: 'Normal', color: 'text-green-400' };
    if (bmi < 30) return { text: 'Sobrepeso', color: 'text-orange-400' };
    return { text: 'Obesidad', color: 'text-red-400' };
  };

  const calculateMaxHR = () => {
    // Tanaka formula: 208 - 0.7 * age
    return Math.round(208 - 0.7 * profile.age);
  };

  const bmi = parseFloat(calculateBMI());
  const bmiCategory = getBMICategory(bmi);
  const suggestedMaxHR = calculateMaxHR();

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const success = onImportData(content);
        if (success) {
          setImportSuccess(true);
          setImportError('');
          setTimeout(() => setImportSuccess(false), 3000);
        } else {
          setImportError('Error al importar los datos. Formato incorrecto.');
        }
      } catch {
        setImportError('Error al leer el archivo.');
      }
    };
    reader.readAsText(file);
    event.target.value = ''; // Reset input
  };

  return (
    <div className="p-4 pb-24 overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <User className="text-purple-400" />
            Mi Perfil
          </h2>
          <p className="text-gray-400 text-sm mt-1">Usuario: {username}</p>
        </div>
        <button
          onClick={onLogout}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm"
        >
          Cerrar sesión
        </button>
      </div>

      <div className="bg-gray-800 rounded-xl p-4 mb-4">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Activity className="text-blue-400" size={20} />
          Datos Físicos
        </h3>

        <div className="space-y-4">
          {/* Height */}
          <div>
            <label className="block text-sm text-gray-400 mb-2 flex items-center gap-1">
              <Ruler size={14} /> Altura
            </label>
            <WheelPicker
              value={profile.height}
              min={120}
              max={220}
              step={1}
              suffix=" cm"
              label="Altura"
              onChange={(value) => setProfile({ ...profile, height: value })}
            />
          </div>

          {/* Weight */}
          <div>
            <label className="block text-sm text-gray-400 mb-2 flex items-center gap-1">
              <Weight size={14} /> Peso
            </label>
            <WheelPicker
              value={profile.weight}
              min={30}
              max={200}
              step={1}
              suffix=" kg"
              label="Peso"
              onChange={(value) => setProfile({ ...profile, weight: value })}
            />
          </div>

          {/* Age */}
          <div>
            <label className="block text-sm text-gray-400 mb-2 flex items-center gap-1">
              <Calendar size={14} /> Edad
            </label>
            <WheelPicker
              value={profile.age}
              min={10}
              max={100}
              step={1}
              suffix=" años"
              label="Edad"
              onChange={(value) => setProfile({ ...profile, age: value })}
            />
          </div>

          {/* Sex */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Sexo</label>
            <div className="flex gap-2">
              <button
                onClick={() => setProfile({ ...profile, sex: 'male' })}
                className={`flex-1 py-3 rounded-xl font-medium transition-all ${
                  profile.sex === 'male'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                }`}
              >
                👨 Masculino
              </button>
              <button
                onClick={() => setProfile({ ...profile, sex: 'female' })}
                className={`flex-1 py-3 rounded-xl font-medium transition-all ${
                  profile.sex === 'female'
                    ? 'bg-pink-600 text-white'
                    : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                }`}
              >
                👩 Femenino
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gray-800 rounded-xl p-4 mb-4">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Heart className="text-red-400" size={20} />
          Frecuencia Cardíaca
        </h3>

        <div className="space-y-4">
          {/* Resting HR */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">
              FC en reposo
            </label>
            <WheelPicker
              value={profile.restingHeartRate}
              min={40}
              max={100}
              step={1}
              suffix=" bpm"
              label="FC en reposo"
              onChange={(value) => setProfile({ ...profile, restingHeartRate: value })}
            />
          </div>

          {/* Max HR */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">
              FC máxima
            </label>
            <WheelPicker
              value={profile.maxHeartRate}
              min={120}
              max={220}
              step={1}
              suffix=" bpm"
              label="FC máxima"
              onChange={(value) => setProfile({ ...profile, maxHeartRate: value })}
            />
            <p className="text-xs text-gray-500 mt-2">
              💡 Sugerida según tu edad: <span className="text-orange-400">{suggestedMaxHR} bpm</span>
              {profile.maxHeartRate !== suggestedMaxHR && (
                <button
                  onClick={() => setProfile({ ...profile, maxHeartRate: suggestedMaxHR })}
                  className="ml-2 text-orange-400 underline"
                >
                  Usar sugerida
                </button>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* BMI Card */}
      <div className="bg-gradient-to-br from-purple-900/50 to-blue-900/50 rounded-xl p-4 mb-4 border border-purple-700/30">
        <h3 className="font-semibold mb-3 text-purple-300">Tu IMC</h3>
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-bold text-white">{bmi}</span>
          <span className={`text-lg ${bmiCategory.color}`}>{bmiCategory.text}</span>
        </div>
        <div className="mt-3 h-2 bg-gray-700 rounded-full overflow-hidden">
          <div className="h-full flex">
            <div className="bg-yellow-500 flex-1" />
            <div className="bg-green-500 flex-1" />
            <div className="bg-orange-500 flex-1" />
            <div className="bg-red-500 flex-1" />
          </div>
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>18.5</span>
          <span>25</span>
          <span>30</span>
          <span>35+</span>
        </div>
        <div 
          className="w-3 h-3 bg-white rounded-full shadow-lg mt-1 transform -translate-y-4"
          style={{ 
            marginLeft: `${Math.min(Math.max((bmi - 15) / 25 * 100, 0), 100)}%`,
            transform: 'translateX(-50%) translateY(-0.75rem)'
          }}
        />
      </div>

      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={saved}
        className={`w-full py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${
          saved
            ? 'bg-green-600 text-white'
            : 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700'
        }`}
      >
        {saved ? (
          <>
            <Check size={20} /> Guardado
          </>
        ) : (
          <>
            <Save size={20} /> Guardar Perfil
          </>
        )}
      </button>

      {/* Export/Import Section */}
      <div className="mt-6 bg-gray-800 rounded-xl p-4">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Download className="text-green-400" size={20} />
          Exportar / Importar Datos
        </h3>

        <p className="text-sm text-gray-400 mb-4">
          Exporta todos tus datos (entrenamientos, ejercicios, cardio) a un archivo JSON que puedes guardar o importar en otro dispositivo.
        </p>

        <div className="flex gap-3">
          <button
            onClick={onExportData}
            className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
          >
            <Download size={18} /> Exportar
          </button>
          
          <label className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer">
            <Upload size={18} /> Importar
            <input
              type="file"
              accept=".json"
              onChange={handleFileImport}
              className="hidden"
            />
          </label>
        </div>

        {importError && (
          <p className="mt-3 text-red-400 text-sm">{importError}</p>
        )}
        {importSuccess && (
          <p className="mt-3 text-green-400 text-sm flex items-center gap-1">
            <Check size={16} /> Datos importados correctamente. Recarga la página para ver los cambios.
          </p>
        )}
      </div>
    </div>
  );
}
