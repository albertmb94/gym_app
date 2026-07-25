import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, Suspense, lazy } from 'react';
import { useStorage } from './hooks/useStorage';
import { LanguageProvider } from './contexts/LanguageContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './contexts/ToastContext';
import LoginScreen from './components/LoginScreen';
import HomeTab from './components/HomeTab';
import HistoryTab from './components/HistoryTab';
import TemplatesTab from './components/TemplatesTab';
import ExercisesTab from './components/ExercisesTab';
import ProfileTab from './components/ProfileTab';
import Shell from './components/layout/Shell';
import type { WorkoutSession } from './types';

const StatsTab = lazy(() => import('./components/StatsTab'));
const CardioTab = lazy(() => import('./components/CardioTab'));
const WorkoutSessionView = lazy(() => import('./components/WorkoutSession').then((m) => ({ default: m.default })));

function LoadingShell({ message }: { message: string }) {
  return (
    <div className="grid min-h-dvh place-items-center bg-canvas text-muted">
      {message}
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <ToastProvider>
          <BrowserRouter>
            <AppInner />
          </BrowserRouter>
        </ToastProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

function AppInner() {
  const storage = useStorage();
  const {
    currentUser,
    login,
    register,
    logout,
    knownUsers,
    removeKnownUser,
    getProfile,
    getSessions,
    saveSession,
    deleteSession,
    duplicateSession,
    updateWeeklyPlan,
    saveTemplate,
    deleteTemplate,
    getAllTemplates,
    getSuggestedSets,
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
    exportUserData,
    importUserData,
    downloadTemplate,
    downloadExerciseNames,
    syncStatus,
    syncConflict,
    resolveConflict,
    forceSyncNow,
  } = storage;

  const [activeSession, setActiveSession] = useState<WorkoutSession | null>(null);

  if (!currentUser) {
    return (
      <LoginScreen
        onLogin={(username, token) => login(username, token)}
        onRegister={(username, token) => register(username, token)}
        knownUsers={knownUsers}
        onRemoveUser={removeKnownUser}
      />
    );
  }

  const sessions = getSessions();
  const cardioSessions = getCardioSessions();
  const templates = getAllTemplates();
  const physicalProfile = getPhysicalProfile();
  const customExercises = getCustomExercises();
  const profile = getProfile();

  const handleSaveSession = (session: WorkoutSession) => {
    const calories = estimateWorkoutCalories(session);
    saveSession({ ...session, caloriesBurned: calories });
  };

  return (
    <Shell
      username={currentUser}
      syncStatus={syncStatus}
      syncConflict={syncConflict}
      onResolveConflict={resolveConflict}
      onForceSync={forceSyncNow}
      onLogout={logout}
    >
      <Routes>
        <Route
          path="/"
          element={
            <HomeTab
              sessions={sessions}
              weeklyPlan={profile?.weeklyPlan || { daysPerWeek: 3, days: [] }}
              templates={templates}
              username={currentUser}
              onStartSession={setActiveSession}
              onContinueWorkout={(s) => setActiveSession(s)}
              onEditSession={(s) => setActiveSession(s)}
              onDeleteSession={deleteSession}
              getSuggestedSets={getSuggestedSets}
            />
          }
        />
        <Route
          path="/history"
          element={
            <HistoryTab
              sessions={sessions}
              cardioSessions={cardioSessions}
              onDelete={deleteSession}
              onContinue={(s) => setActiveSession(s)}
              onDuplicate={(id) => {
                const copy = duplicateSession(id);
                if (copy) setActiveSession(copy);
              }}
            />
          }
        />
        <Route
          path="/cardio"
          element={
            <Suspense fallback={<LoadingShell message="Cargando cardio…" />}>
              <CardioTab
                cardioSessions={cardioSessions}
                physicalProfile={physicalProfile}
                onSaveSession={saveCardioSession}
                onDeleteSession={deleteCardioSession}
                estimateCalories={estimateCardioCalories}
              />
            </Suspense>
          }
        />
        <Route
          path="/stats"
          element={
            <Suspense fallback={<LoadingShell message="Cargando estadísticas…" />}>
              <StatsTab sessions={sessions} cardioSessions={cardioSessions} />
            </Suspense>
          }
        />
        <Route
          path="/plan"
          element={
            <TemplatesTab
              templates={templates}
              userCustomTemplates={profile?.customTemplates || []}
              weeklyPlan={profile?.weeklyPlan || { daysPerWeek: 3, days: [] }}
              onSaveTemplate={saveTemplate}
              onDeleteTemplate={deleteTemplate}
              onUpdateWeeklyPlan={updateWeeklyPlan}
              getSuggestedSets={getSuggestedSets}
              allExercises={getAllExercises()}
            />
          }
        />
        <Route
          path="/exercises"
          element={
            <ExercisesTab
              customExercises={customExercises}
              onSaveExercise={saveExercise}
              onUpdateExercise={updateExercise}
              onDeleteExercise={deleteExercise}
            />
          }
        />
        <Route
          path="/profile"
          element={
            <ProfileTab
              physicalProfile={physicalProfile}
              onSaveProfile={updatePhysicalProfile}
              username={currentUser}
              onLogout={logout}
              onExportData={exportUserData}
              onImportData={(json) => importUserData(json).ok}
              onDownloadTemplate={downloadTemplate}
              onDownloadExerciseNames={downloadExerciseNames}
            />
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {activeSession && (
        <Suspense fallback={<LoadingShell message="Cargando sesión…" />}>
          <WorkoutSessionView
            session={activeSession}
            onSave={handleSaveSession}
            onClose={() => setActiveSession(null)}
            onDelete={deleteSession}
            getSuggestedSets={getSuggestedSets}
          />
        </Suspense>
      )}
    </Shell>
  );
}