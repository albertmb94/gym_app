import { createContext, useContext, ReactNode } from 'react';
import { Exercise } from '../types';
import { EXERCISES } from '../data/exercises';

interface ExercisesContextType {
  allExercises: Exercise[];
  getExerciseById: (id: string) => Exercise | undefined;
}

const ExercisesContext = createContext<ExercisesContextType | null>(null);

interface ExercisesProviderProps {
  customExercises: Exercise[];
  hiddenExerciseIds?: string[];
  children: ReactNode;
}

export function ExercisesProvider({ customExercises, hiddenExerciseIds = [], children }: ExercisesProviderProps) {
  // Start with default exercises, then override/add custom ones
  const allExercises: Exercise[] = [...EXERCISES];
  customExercises.forEach(custom => {
    const defaultIdx = allExercises.findIndex(e => e.id === custom.id);
    if (defaultIdx >= 0) {
      allExercises[defaultIdx] = custom;
    } else {
      allExercises.push(custom);
    }
  });

  // Filter out exercises this user has hidden (only hides default ones — custom ones are deleted outright)
  const visibleExercises = allExercises.filter(e => !hiddenExerciseIds.includes(e.id) || e.isCustom);

  const getExerciseById = (id: string): Exercise | undefined => {
    // Always return even if hidden (needed for history display)
    return allExercises.find(e => e.id === id);
  };

  return (
    <ExercisesContext.Provider value={{ allExercises: visibleExercises, getExerciseById }}>
      {children}
    </ExercisesContext.Provider>
  );
}

export function useExercises() {
  const context = useContext(ExercisesContext);
  if (!context) {
    return {
      allExercises: EXERCISES,
      getExerciseById: (id: string) => EXERCISES.find(e => e.id === id),
    };
  }
  return context;
}
