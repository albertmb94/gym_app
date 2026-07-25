import { useState, useEffect } from 'react';
import type { PhysicalProfile } from '../types';
import { User, Save, Check, Download, Upload, Palette, Globe, LogOut } from 'lucide-react';
import NumberPicker from './NumberPicker';
import { useTheme, THEMES } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Field } from './ui/Field';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { bmi, maxHeartRateFromAge } from '../utils/metrics';
import { cn } from '../utils/cn';

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

const SEX_OPTIONS: Array<{ id: 'male' | 'female' | 'other'; labelKey: 'male' | 'female' | 'other' }> = [
  { id: 'male', labelKey: 'male' },
  { id: 'female', labelKey: 'female' },
  { id: 'other', labelKey: 'other' },
];

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

  const bmiValue = bmi(profile);
  const bmiCategory = (() => {
    if (bmiValue < 18.5) return { text: t.profile.underweight, color: 'text-amber-400' };
    if (bmiValue < 25) return { text: t.profile.normal, color: 'text-emerald-400' };
    if (bmiValue < 30) return { text: t.profile.overweight, color: 'text-orange-400' };
    return { text: t.profile.obese, color: 'text-red-400' };
  })();

  const suggestedMaxHR = maxHeartRateFromAge(profile.age);

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
    <div className="space-y-4">
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-primary">
              <User className="text-orange-300" aria-hidden="true" />
              {t.profile.account}
            </h1>
            <p className="text-sm text-secondary">
              {t.profile.loggedInAs}: <span className="font-semibold text-primary">{username}</span>
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={onLogout} iconLeft={<LogOut className="h-4 w-4" />}>
            {t.profile.logout}
          </Button>
        </div>
      </Card>

      <Card title={t.profile.physicalData}>
        <div className="grid gap-4">
          <Field label={t.profile.height}>
            <NumberPicker
              value={profile.height}
              min={120}
              max={220}
              step={1}
              suffix=" cm"
              color="blue"
              onChange={(value) => setProfile({ ...profile, height: value })}
            />
          </Field>
          <Field label={t.profile.weight}>
            <NumberPicker
              value={profile.weight}
              min={30}
              max={200}
              step={0.5}
              suffix=" kg"
              color="purple"
              onChange={(value) => setProfile({ ...profile, weight: value })}
            />
          </Field>
          <Field label={t.profile.age}>
            <NumberPicker
              value={profile.age}
              min={10}
              max={100}
              step={1}
              suffix={language === 'es' ? ' años' : ' yrs'}
              color="green"
              onChange={(value) => setProfile({ ...profile, age: value })}
            />
          </Field>
          <Field label={t.profile.sex}>
            <div role="radiogroup" aria-label={t.profile.sex} className="grid grid-cols-3 gap-2">
              {SEX_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  role="radio"
                  aria-checked={profile.sex === opt.id}
                  onClick={() => setProfile({ ...profile, sex: opt.id })}
                  className={cn(
                    'rounded-2xl py-3 text-sm font-semibold transition-colors',
                    profile.sex === opt.id
                      ? opt.id === 'male'
                        ? 'bg-blue-500 text-white'
                        : opt.id === 'female'
                          ? 'bg-pink-500 text-white'
                          : 'bg-purple-500 text-white'
                      : 'bg-surface-3 text-secondary hover:bg-surface-2',
                  )}
                >
                  {t.profile[opt.labelKey]}
                </button>
              ))}
            </div>
          </Field>
        </div>
      </Card>

      <Card
        title={t.profile.restingHR}
      >
        <div className="grid gap-4">
          <Field label={t.profile.restingHR}>
            <NumberPicker
              value={profile.restingHeartRate}
              min={25}
              max={100}
              step={1}
              suffix=" bpm"
              color="red"
              onChange={(value) => setProfile({ ...profile, restingHeartRate: value })}
            />
          </Field>
          <Field label={t.profile.maxHR} description={t.profile.suggestedMaxHR}>
            <NumberPicker
              value={profile.maxHeartRate}
              min={120}
              max={220}
              step={1}
              suffix=" bpm"
              color="orange"
              onChange={(value) => setProfile({ ...profile, maxHeartRate: value })}
            />
            {profile.maxHeartRate !== suggestedMaxHR && (
              <button
                type="button"
                onClick={() => setProfile({ ...profile, maxHeartRate: suggestedMaxHR })}
                className="text-xs text-orange-300 underline-offset-2 hover:underline"
              >
                {language === 'es' ? 'Usar sugerida' : 'Use suggested'} ({suggestedMaxHR} bpm)
              </button>
            )}
          </Field>
        </div>
      </Card>

      <Card title={t.profile.bmi}>
        <div className="flex items-baseline gap-3">
          <span className="text-4xl font-bold text-primary">{bmiValue.toFixed(1)}</span>
          <span className={cn('text-sm font-medium', bmiCategory.color)}>{bmiCategory.text}</span>
        </div>
        <p className="mt-1 text-xs text-muted">{t.profile.bmiNote}</p>
      </Card>

      <Button
        onClick={handleSave}
        variant={saved ? 'success' : 'primary'}
        fullWidth
        size="lg"
        iconLeft={saved ? <Check className="h-5 w-5" /> : <Save className="h-5 w-5" />}
      >
        {saved ? t.profile.saved : t.profile.saveChanges}
      </Button>

      <Card title={t.profile.appearance}>
        <div className="space-y-4">
          <div>
            <label className="mb-2 flex items-center gap-2 text-sm font-medium text-secondary">
              <Globe className="h-4 w-4" aria-hidden="true" />
              {t.profile.language}
            </label>
            <div role="radiogroup" aria-label={t.profile.language} className="grid grid-cols-2 gap-2">
              {[
                { id: 'es', label: '🇪🇸 ' + t.profile.spanish },
                { id: 'en', label: '🇬🇧 ' + t.profile.english },
              ].map((lang) => (
                <button
                  key={lang.id}
                  type="button"
                  role="radio"
                  aria-checked={language === lang.id}
                  onClick={() => setLanguage(lang.id as 'es' | 'en')}
                  className={cn(
                    'rounded-2xl py-2.5 text-sm font-semibold transition-colors',
                    language === lang.id ? 'bg-orange-500 text-white' : 'bg-surface-3 text-secondary hover:bg-surface-2',
                  )}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-2 flex items-center gap-2 text-sm font-medium text-secondary">
              <Palette className="h-4 w-4" aria-hidden="true" />
              {t.profile.theme}
            </label>
            <div role="radiogroup" aria-label={t.profile.theme} className="grid grid-cols-2 gap-2">
              {THEMES.map((th) => (
                <button
                  key={th.id}
                  type="button"
                  role="radio"
                  aria-checked={theme === th.id}
                  onClick={() => setTheme(th.id)}
                  className={cn(
                    'rounded-2xl border p-3 text-left transition-colors',
                    theme === th.id ? 'border-orange-500 bg-surface-2' : 'border-app bg-surface-2 hover:bg-surface-3',
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xl" aria-hidden="true">{th.emoji}</span>
                    <span className="text-sm font-semibold text-primary">{th.name}</span>
                    {theme === th.id && <Check className="ml-auto h-4 w-4 text-orange-300" aria-hidden="true" />}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <Card title={t.profile.data}>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="success" onClick={onExportData} iconLeft={<Download className="h-4 w-4" />}>
            {t.profile.exportData}
          </Button>
          <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl bg-blue-500 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-600">
            <Upload className="h-4 w-4" aria-hidden="true" />
            {t.profile.importData}
            <input type="file" accept=".json" onChange={handleFileImport} className="sr-only" />
          </label>
          <Button variant="secondary" size="sm" onClick={onDownloadTemplate}>
            {t.profile.downloadTemplate}
          </Button>
          <Button variant="secondary" size="sm" onClick={onDownloadExerciseNames}>
            {t.profile.downloadExercises}
          </Button>
        </div>
        {importError && (
          <p role="alert" className="mt-3 text-sm text-red-400">
            {importError}
          </p>
        )}
        {importSuccess && (
          <p className="mt-3 flex items-center gap-1 text-sm text-emerald-400">
            <Check className="h-4 w-4" aria-hidden="true" /> {t.profile.importSuccess}
          </p>
        )}
      </Card>
    </div>
  );
}