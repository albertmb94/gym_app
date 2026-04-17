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
  children: ReactNode;
}

export function ExercisesProvider({ customExercises, children }: ExercisesProviderProps) {
  // Merge default exercises with custom ones
  // Custom exercises override defaults with same ID
  const allExercises: Exercise[] = [...EXERCISES];
  customExercises.forEach(custom => {
    const defaultIdx = allExercises.findIndex(e => e.id === custom.id);
    if (defaultIdx >= 0) {
      allExercises[defaultIdx] = custom;
    } else {
      allExercises.push(custom);
    }
  });

  const getExerciseById = (id: string): Exercise | undefined => {
    return allExercises.find(e => e.id === id);
  };

  return (
    <ExercisesContext.Provider value={{ allExercises, getExerciseById }}>
      {children}
    </ExercisesContext.Provider>
  );
}

export function useExercises() {
  const context = useContext(ExercisesContext);
  if (!context) {
    // Return default exercises if no provider
    return {
      allExercises: EXERCISES,
      getExerciseById: (id: string) => EXERCISES.find(e => e.id === id),
    };
  }
  return context;
}
