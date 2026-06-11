import { useState } from 'react';
import { useStorage } from './hooks/useStorage';
import LoginScreen from './components/LoginScreen';
import HomeTab from './components/HomeTab';
import HistoryTab from './components/HistoryTab';
import StatsTab from './components/StatsTab';
import TemplatesTab from './components/TemplatesTab';
import ExercisesTab from './components/ExercisesTab';
import CardioTab from './components/CardioTab';
import ProfileModal from './components/ProfileModal';
import WorkoutSessionView from './components/WorkoutSession';
import { WorkoutSession } from './types';
import { Home, History, BarChart2, Calendar, Dumbbell, LogOut, Activity, UserCircle } from 'lucide-react';

type Tab = 'home' | 'cardio' | 'history' | 'stats' | 'templates' | 'exercises';

// Key used to keep an in-progress workout safe if the app gets killed in the
// background (e.g. phone closes the tab after a few minutes). See issue: the
// active session is auto-persisted here and restored on the next launch.
const ACTIVE_SESSION_KEY = 'gymtracker_active_session';

function loadActiveSession(): WorkoutSession | null {
  try {
    const raw = localStorage.getItem(ACTIVE_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const currentUser = localStorage.getItem('gymtracker_current_user');
    if (parsed && parsed.session && parsed.username && parsed.username === currentUser) {
      return parsed.session as WorkoutSession;
    }
    return null;
  } catch {
    return null;
  }
}

export default function App() {
  const {
    currentUser,
    login,
    logout,
    getProfile,
    getSessions,
    saveSession,
    deleteSession,
    updateWeeklyPlan,
    saveTemplate,
    deleteTemplate,
    getAllTemplates,
    getSuggestedSets,
    updateProfileDetails,
    getCardioSessions,
    saveCardioSession,
    deleteCardioSession,
    getAllExercises,
    saveExercise,
    deleteExercise,
  } = useStorage();

  const [activeTab, setActiveTab] = useState<Tab>('home');
  // Restore any workout that was in progress when the app was last closed.
  const [activeSession, setActiveSession] = useState<WorkoutSession | null>(loadActiveSession);
  const [showProfile, setShowProfile] = useState(false);

  // Get all stored usernames for quick login
  const storedData = localStorage.getItem('gymtracker_data');
  const allUsers = storedData ? Object.keys(JSON.parse(storedData).users || {}) : [];

  if (!currentUser) {
    return <LoginScreen onLogin={login} existingUsers={allUsers} />;
  }

  const profile = getProfile();
  const sessions = getSessions();
  const cardioSessions = getCardioSessions();
  const exercises = getAllExercises();
  const templates = profile?.customTemplates || [];
  const weeklyPlan = profile?.weeklyPlan || { daysPerWeek: 3, days: [] };
  const allTemplates = getAllTemplates();

  const handleStartSession = (session: WorkoutSession) => {
    setActiveSession(session);
  };

  const handleSaveSession = (session: WorkoutSession) => {
    saveSession(session);
  };

  const handleCloseSession = () => {
    setActiveSession(null);
    // The workout is no longer in progress; drop the safety copy.
    localStorage.removeItem(ACTIVE_SESSION_KEY);
  };

  const handleContinueSession = (session: WorkoutSession) => {
    setActiveSession(session);
    setActiveTab('home');
  };

  const handleLogout = () => {
    // Don't carry an in-memory workout over to the next account that logs in.
    setActiveSession(null);
    logout();
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'home', label: 'Inicio', icon: <Home className="w-5 h-5" /> },
    { id: 'cardio', label: 'Cardio', icon: <Activity className="w-5 h-5" /> },
    { id: 'history', label: 'Historial', icon: <History className="w-5 h-5" /> },
    { id: 'stats', label: 'Evolución', icon: <BarChart2 className="w-5 h-5" /> },
    { id: 'templates', label: 'Plan', icon: <Calendar className="w-5 h-5" /> },
    { id: 'exercises', label: 'Ejercicios', icon: <Dumbbell className="w-5 h-5" /> },
  ];

  return (
    <div className="flex flex-col h-[100dvh] max-h-[100dvh] bg-gray-900 max-w-lg mx-auto relative overflow-hidden">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
            <Dumbbell className="w-4 h-4 text-white" />
          </div>
          <span className="text-white font-bold">GymTracker</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowProfile(true)}
            className="flex items-center gap-1.5 px-3 py-1 bg-gray-700/50 hover:bg-gray-700 border border-gray-600 rounded-lg text-gray-200 hover:text-white transition-colors"
          >
            <UserCircle className="w-4 h-4 text-orange-400" />
            <span className="text-xs font-semibold">{currentUser}</span>
          </button>
          <button
            onClick={handleLogout}
            className="p-1.5 text-gray-500 hover:text-red-400 transition-colors"
            title="Cerrar sesión"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-hidden relative">
        <div className="h-full overflow-y-auto">
          {activeTab === 'home' && (
            <HomeTab
              sessions={sessions}
              weeklyPlan={weeklyPlan}
              templates={allTemplates}
              username={currentUser}
              exercises={exercises}
              onStartSession={handleStartSession}
              getSuggestedSets={getSuggestedSets}
            />
          )}
          {activeTab === 'cardio' && (
            <CardioTab
              profile={profile}
              cardioSessions={cardioSessions}
              onSaveCardio={saveCardioSession}
              onDeleteCardio={deleteCardioSession}
            />
          )}
          {activeTab === 'history' && (
            <HistoryTab
              sessions={sessions}
              exercises={exercises}
              onDelete={deleteSession}
              onContinue={handleContinueSession}
              onUpdate={saveSession}
            />
          )}
          {activeTab === 'stats' && (
            <StatsTab sessions={sessions} />
          )}
          {activeTab === 'templates' && (
            <TemplatesTab
              templates={templates}
              weeklyPlan={weeklyPlan}
              exercises={exercises}
              onSaveTemplate={saveTemplate}
              onDeleteTemplate={deleteTemplate}
              onUpdateWeeklyPlan={updateWeeklyPlan}
              getSuggestedSets={getSuggestedSets}
            />
          )}
          {activeTab === 'exercises' && (
            <ExercisesTab
              exercises={exercises}
              onSaveExercise={saveExercise}
              onDeleteExercise={deleteExercise}
            />
          )}
        </div>
      </div>

      {/* Bottom nav */}
      <div className="bg-gray-800 border-t border-gray-700 flex-shrink-0 safe-area-bottom">
        <div className="flex">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors ${
                activeTab === tab.id
                  ? 'text-orange-400'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {tab.icon}
              <span className="text-[10px] font-semibold">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Workout Session overlay */}
      {activeSession && (
        <WorkoutSessionView
          session={activeSession}
          profile={profile}
          username={currentUser}
          onSave={handleSaveSession}
          onClose={handleCloseSession}
          getSuggestedSets={getSuggestedSets}
          allExercises={exercises}
        />
      )}

      {/* Profile Modal */}
      {showProfile && (
        <ProfileModal
          profile={profile}
          onUpdateDetails={updateProfileDetails}
          onClose={() => setShowProfile(false)}
        />
      )}
    </div>
  );
}
