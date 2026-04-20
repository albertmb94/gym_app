import { useState, useEffect } from 'react';
import { PhysicalProfile } from '../types';
import { User, Ruler, Weight, Heart, Activity, Calendar, Save, Check, Download, Upload, Palette, Globe, LogOut } from 'lucide-react';
import NumberPicker from './NumberPicker';
import { useTheme, THEMES } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';

interface ProfileTabProps {
  physicalProfile: PhysicalProfile | null;
  onSaveProfile: (profile: PhysicalProfile) => void;
  username: string;
  onLogout: () => void;
  onExportData: () => void;
  onImportData: (data: string) => boolean;
  onDownloadTemplate: () => void;
  onDownloadExerciseNames: () => void;
}

export default function ProfileTab({
  physicalProfile,
  onSaveProfile,
  username,
  onLogout,
  onExportData,
  onImportData,
  onDownloadTemplate,
  onDownloadExerciseNames,
}: ProfileTabProps) {
  const { theme, setTheme } = useTheme();
  const { t, language, setLanguage } = useLanguage();
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
    if (physicalProfile) setProfile(physicalProfile);
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
    if (bmi < 18.5) return { text: t.profile.underweight, color: 'text-yellow-400' };
    if (bmi < 25) return { text: t.profile.normal, color: 'text-green-400' };
    if (bmi < 30) return { text: t.profile.overweight, color: 'text-orange-400' };
    return { text: t.profile.obese, color: 'text-red-400' };
  };

  const suggestedMaxHR = Math.round(208 - 0.7 * profile.age);
  const bmi = parseFloat(calculateBMI());
  const bmiCategory = getBMICategory(bmi);

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
          setImportError(t.profile.importError);
        }
      } catch {
        setImportError(t.profile.importError);
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  return (
    <div className="p-4 pb-24 overflow-y-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <User className="text-purple-400" />
            {t.profile.account}
          </h2>
          <p className="text-gray-400 text-sm mt-0.5">{t.profile.loggedInAs}: <span className="text-white font-medium">{username}</span></p>
        </div>
        <button
          onClick={onLogout}
          className="flex items-center gap-1.5 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition-colors"
        >
          <LogOut size={14} /> {t.profile.logout}
        </button>
      </div>

      {/* Physical data */}
      <div className="bg-gray-800 rounded-xl p-4">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Activity className="text-blue-400" size={20} />
          {t.profile.physicalData}
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2 flex items-center gap-1">
              <Ruler size={14} /> {t.profile.height}
            </label>
            <NumberPicker value={profile.height} min={120} max={220} step={1} suffix=" cm" color="blue" onChange={(value) => setProfile({ ...profile, height: value })} />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2 flex items-center gap-1">
              <Weight size={14} /> {t.profile.weight}
            </label>
            <NumberPicker value={profile.weight} min={30} max={200} step={0.5} suffix=" kg" color="purple" onChange={(value) => setProfile({ ...profile, weight: value })} />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2 flex items-center gap-1">
              <Calendar size={14} /> {t.profile.age}
            </label>
            <NumberPicker value={profile.age} min={10} max={100} step={1} suffix={language === 'es' ? ' años' : ' yrs'} color="green" onChange={(value) => setProfile({ ...profile, age: value })} />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">{t.profile.sex}</label>
            <div className="flex gap-2">
              <button
                onClick={() => setProfile({ ...profile, sex: 'male' })}
                className={`flex-1 py-3 rounded-xl font-medium transition-all ${profile.sex === 'male' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}
              >
                👨 {t.profile.male}
              </button>
              <button
                onClick={() => setProfile({ ...profile, sex: 'female' })}
                className={`flex-1 py-3 rounded-xl font-medium transition-all ${profile.sex === 'female' ? 'bg-pink-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}
              >
                👩 {t.profile.female}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Heart rate */}
      <div className="bg-gray-800 rounded-xl p-4">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Heart className="text-red-400" size={20} />
          {t.profile.restingHR.replace(' (ppm)', '').replace(' (bpm)', '')}
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">{t.profile.restingHR}</label>
            <NumberPicker value={profile.restingHeartRate} min={25} max={100} step={1} suffix=" bpm" color="red" onChange={(value) => setProfile({ ...profile, restingHeartRate: value })} />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-2">{t.profile.maxHR}</label>
            <NumberPicker value={profile.maxHeartRate} min={120} max={220} step={1} suffix=" bpm" color="orange" onChange={(value) => setProfile({ ...profile, maxHeartRate: value })} />
            <p className="text-xs text-gray-500 mt-2">
              💡 {t.profile.suggestedMaxHR}: <span className="text-orange-400">{suggestedMaxHR} bpm</span>
              {profile.maxHeartRate !== suggestedMaxHR && (
                <button onClick={() => setProfile({ ...profile, maxHeartRate: suggestedMaxHR })} className="ml-2 text-orange-400 underline">
                  {language === 'es' ? 'Usar sugerida' : 'Use suggested'}
                </button>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* BMI */}
      <div className="bg-gradient-to-br from-purple-900/50 to-blue-900/50 rounded-xl p-4 border border-purple-700/30">
        <h3 className="font-semibold mb-3 text-purple-300">{t.profile.bmi}</h3>
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
        <div className="flex justify-between text-xs text-gray-500 mt-1"><span>18.5</span><span>25</span><span>30</span><span>35+</span></div>
        <div
          className="w-3 h-3 bg-white rounded-full shadow-lg mt-1"
          style={{ marginLeft: `${Math.min(Math.max((bmi - 15) / 25 * 100, 0), 100)}%`, transform: 'translateX(-50%) translateY(-0.75rem)' }}
        />
      </div>

      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={saved}
        className={`w-full py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${saved ? 'bg-green-600 text-white' : 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700'}`}
      >
        {saved ? <><Check size={20} /> {t.profile.saved}</> : <><Save size={20} /> {t.profile.saveChanges}</>}
      </button>

      {/* Appearance: Theme + Language */}
      <div className="bg-gray-800 rounded-xl p-4">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Palette className="text-pink-400" size={20} />
          {t.profile.appearance}
        </h3>

        {/* Language switcher */}
        <div className="mb-4">
          <label className="text-sm text-gray-400 mb-2 flex items-center gap-1.5">
            <Globe size={14} /> {t.profile.language}
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => setLanguage('es')}
              className={`flex-1 py-2.5 rounded-xl font-medium text-sm transition-all ${language === 'es' ? 'bg-orange-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}
            >
              🇪🇸 {t.profile.spanish}
            </button>
            <button
              onClick={() => setLanguage('en')}
              className={`flex-1 py-2.5 rounded-xl font-medium text-sm transition-all ${language === 'en' ? 'bg-orange-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}
            >
              🇬🇧 {t.profile.english}
            </button>
          </div>
        </div>

        {/* Theme picker */}
        <label className="text-sm text-gray-400 mb-2 block">{t.profile.theme}</label>
        <div className="grid grid-cols-2 gap-2">
          {THEMES.map((th) => (
            <button
              key={th.id}
              onClick={() => setTheme(th.id)}
              className={`p-3 rounded-xl text-left transition-all border-2 ${theme === th.id ? 'border-orange-500 bg-gray-700' : 'border-transparent bg-gray-700/50 hover:bg-gray-700'}`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl">{th.emoji}</span>
                <span className="font-semibold text-sm">{th.name}</span>
                {theme === th.id && <Check size={14} className="text-orange-400 ml-auto" />}
              </div>
              <p className="text-xs text-gray-400 leading-tight">{th.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Export/Import */}
      <div className="bg-gray-800 rounded-xl p-4">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Download className="text-green-400" size={20} />
          {t.profile.data}
        </h3>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <button onClick={onExportData} className="py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2 text-sm">
            <Download size={16} /> {t.profile.exportData}
          </button>
          <label className="py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer text-sm">
            <Upload size={16} /> {t.profile.importData}
            <input type="file" accept=".json,.csv" onChange={handleFileImport} className="hidden" />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button onClick={onDownloadTemplate} className="py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-medium transition-colors text-sm">
            📋 {t.profile.downloadTemplate}
          </button>
          <button onClick={onDownloadExerciseNames} className="py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-medium transition-colors text-sm">
            📋 {t.profile.downloadExercises}
          </button>
        </div>

        {importError && <p className="mt-3 text-red-400 text-sm">{importError}</p>}
        {importSuccess && (
          <p className="mt-3 text-green-400 text-sm flex items-center gap-1">
            <Check size={16} /> {t.profile.importSuccess}
          </p>
        )}
      </div>
    </div>
  );
}
