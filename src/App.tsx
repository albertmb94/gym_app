import { useState } from 'react';
import { useStorage } from './hooks/useStorage';
import { ExercisesProvider } from './contexts/ExercisesContext';
import LoginScreen from './components/LoginScreen';
import HomeTab from './components/HomeTab';
import HistoryTab from './components/HistoryTab';
import StatsTab from './components/StatsTab';
import TemplatesTab from './components/TemplatesTab';
import ExercisesTab from './components/ExercisesTab';
import ProfileTab from './components/ProfileTab';
import CardioTab from './components/CardioTab';
import WorkoutSessionView from './components/WorkoutSession';
import { WorkoutSession } from './types';
import { Home, History, BarChart2, Calendar, Dumbbell, User, Activity, LogOut } from 'lucide-react';

type Tab = 'home' | 'history' | 'stats' | 'templates' | 'exercises' | 'profile' | 'cardio';

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
    // New functions
    updatePhysicalProfile,
    getPhysicalProfile,
    getCustomExercises,
    getAllExercises,
    saveExercise,
    updateExercise,
    deleteExercise,
    getCardioSessions,
    saveCardioSession,
    deleteCardioSession,
    estimateWorkoutCalories,
    estimateCardioCalories,
    // Export/Import
    exportUserData,
    importUserData,
    downloadTemplate,
    downloadExerciseNames,
    serverOn,
    syncStatus,
  } = useStorage();

  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [activeSession, setActiveSession] = useState<WorkoutSession | null>(null);

  // Get all stored usernames for quick login
  const storedData = localStorage.getItem('gymtracker_data');
  const allUsers = storedData ? Object.keys(JSON.parse(storedData).users || {}) : [];

  if (!currentUser) {
    return <LoginScreen onLogin={login} existingUsers={allUsers} />;
  }

  const profile = getProfile();
  const sessions = getSessions();
  const templates = profile?.customTemplates || [];
  const weeklyPlan = profile?.weeklyPlan || { daysPerWeek: 3, days: [] };
  const allTemplates = getAllTemplates();
  const physicalProfile = getPhysicalProfile();
  const customExercises = getCustomExercises();
  const allExercises = getAllExercises();
  const cardioSessions = getCardioSessions();

  const handleStartSession = (session: WorkoutSession) => {
    setActiveSession(session);
  };

  const handleSaveSession = (session: WorkoutSession) => {
    // Add calorie estimation to the session
    const calories = estimateWorkoutCalories(session);
    const sessionWithCalories = { ...session, caloriesBurned: calories };
    saveSession(sessionWithCalories);
  };

  const handleCloseSession = () => {
    setActiveSession(null);
  };

  const handleContinueSession = (session: WorkoutSession) => {
    setActiveSession(session);
    setActiveTab('home');
  };

  // Primary tabs (always visible)
  const primaryTabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'home', label: 'Inicio', icon: <Home className="w-5 h-5" /> },
    { id: 'history', label: 'Historial', icon: <History className="w-5 h-5" /> },
    { id: 'cardio', label: 'Cardio', icon: <Activity className="w-5 h-5" /> },
    { id: 'stats', label: 'Stats', icon: <BarChart2 className="w-5 h-5" /> },
    { id: 'profile', label: 'Perfil', icon: <User className="w-5 h-5" /> },
  ];

  // Secondary tabs (accessible via profile or swipe)
  const secondaryTabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'templates', label: 'Plan', icon: <Calendar className="w-5 h-5" /> },
    { id: 'exercises', label: 'Ejercicios', icon: <Dumbbell className="w-5 h-5" /> },
  ];

  // Calculate header height based on secondary tabs visibility
  const showSecondaryTabs = activeTab === 'profile' || activeTab === 'templates' || activeTab === 'exercises';

  return (
    <ExercisesProvider customExercises={customExercises}>
    <div className="h-screen bg-gray-900 max-w-lg mx-auto relative overflow-hidden">
      {/* Fixed Header */}
      <div className="fixed top-0 left-0 right-0 z-50 max-w-lg mx-auto">
        <div className="bg-gray-800 border-b border-gray-700 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
              <Dumbbell className="w-4 h-4 text-white" />
            </div>
            <span className="text-white font-bold">GymTracker</span>
          </div>
          <div className="flex items-center gap-2">
            {serverOn ? (
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  syncStatus === 'synced'
                    ? 'bg-green-900 text-green-300'
                    : syncStatus === 'syncing'
                    ? 'bg-yellow-900 text-yellow-300'
                    : syncStatus === 'error'
                    ? 'bg-red-900 text-red-300'
                    : 'bg-gray-700 text-gray-400'
                }`}
                title={`Sincronización con servidor: ${syncStatus}`}
              >
                {syncStatus === 'syncing' ? '⟳ sync' : syncStatus === 'synced' ? '☁ sync' : syncStatus === 'error' ? '⚠ sync' : '☁'}
              </span>
            ) : (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-700 text-gray-500" title="Sin conexión al servidor — datos solo en este dispositivo">
                local
              </span>
            )}
            <span className="text-gray-400 text-sm">{currentUser}</span>
            <button
              onClick={logout}
              className="p-1.5 text-gray-500 hover:text-white transition-colors"
              title="Cerrar sesión"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Secondary tabs bar - shown when in profile */}
        {showSecondaryTabs && (
          <div className="bg-gray-800/95 backdrop-blur-sm border-b border-gray-700 px-2 py-1.5 flex gap-2 overflow-x-auto scrollbar-hide">
            {secondaryTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'bg-orange-600 text-white'
                    : 'bg-gray-700 text-gray-400 hover:text-white'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Content area - with padding for fixed header and footer */}
      <div 
        className="h-full overflow-y-auto"
        style={{ 
          paddingTop: showSecondaryTabs ? '100px' : '56px',
          paddingBottom: '70px'
        }}
      >
        <div className="min-h-full">
           {activeTab === 'home' && (
             <HomeTab
               sessions={sessions}
               weeklyPlan={weeklyPlan}
               templates={allTemplates}
               username={currentUser}
               onStartSession={handleStartSession}
               onContinueWorkout={handleContinueSession}
               onEditSession={handleContinueSession}
               getSuggestedSets={getSuggestedSets}
             />
           )}
          {activeTab === 'history' && (
            <HistoryTab
              sessions={sessions}
              onDelete={deleteSession}
              onContinue={handleContinueSession}
            />
          )}
          {activeTab === 'cardio' && (
            <CardioTab
              cardioSessions={cardioSessions}
              physicalProfile={physicalProfile}
              onSaveSession={saveCardioSession}
              onDeleteSession={deleteCardioSession}
              estimateCalories={estimateCardioCalories}
            />
          )}
          {activeTab === 'stats' && (
            <StatsTab 
              sessions={sessions} 
              cardioSessions={cardioSessions}
            />
          )}
          {activeTab === 'templates' && (
            <TemplatesTab
              templates={templates}
              weeklyPlan={weeklyPlan}
              onSaveTemplate={saveTemplate}
              onDeleteTemplate={deleteTemplate}
              onUpdateWeeklyPlan={updateWeeklyPlan}
              getSuggestedSets={getSuggestedSets}
              allExercises={allExercises}
            />
          )}
          {activeTab === 'exercises' && (
            <ExercisesTab
              customExercises={customExercises}
              onSaveExercise={saveExercise}
              onUpdateExercise={updateExercise}
              onDeleteExercise={deleteExercise}
            />
          )}
          {activeTab === 'profile' && (
            <ProfileTab
              physicalProfile={physicalProfile}
              onSaveProfile={updatePhysicalProfile}
              username={currentUser}
              onLogout={logout}
              onExportData={exportUserData}
              onImportData={importUserData}
              onDownloadTemplate={downloadTemplate}
              onDownloadExerciseNames={downloadExerciseNames}
            />
          )}
        </div>
      </div>

      {/* Fixed Bottom nav */}
      <div className="fixed bottom-0 left-0 right-0 z-50 max-w-lg mx-auto bg-gray-800 border-t border-gray-700 safe-area-bottom">
        <div className="flex">
          {primaryTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors ${
                activeTab === tab.id || 
                (tab.id === 'profile' && (activeTab === 'templates' || activeTab === 'exercises'))
                  ? 'text-orange-400'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {tab.icon}
              <span className="text-xs font-medium">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Workout Session overlay */}
      {activeSession && (
        <WorkoutSessionView
          session={activeSession}
          onSave={handleSaveSession}
          onClose={handleCloseSession}
          getSuggestedSets={getSuggestedSets}
        />
      )}
    </div>
    </ExercisesProvider>
  );
}
