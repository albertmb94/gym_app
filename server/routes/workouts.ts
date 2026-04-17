import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../database.js';

const router = Router();

// Get all workouts for a user
router.get('/:userId', (req, res) => {
  const { userId } = req.params;
  
  const workouts = db.prepare(`
    SELECT * FROM workouts WHERE user_id = ? ORDER BY date DESC
  `).all(userId) as any[];
  
  // Get exercises and sets for each workout
  const workoutsWithDetails = workouts.map(workout => {
    const exercises = db.prepare(`
      SELECT * FROM workout_exercises WHERE workout_id = ? ORDER BY order_index
    `).all(workout.id) as any[];
    
    const exercisesWithSets = exercises.map(ex => {
      const sets = db.prepare(`
        SELECT * FROM exercise_sets WHERE workout_exercise_id = ? ORDER BY set_number
      `).all(ex.id) as any[];
      
      return {
        id: ex.id,
        exerciseId: ex.exercise_id,
        name: ex.exercise_name,
        sets: sets.map(s => ({
          id: s.id,
          reps: s.reps,
          weight: s.weight,
          completed: !!s.completed
        }))
      };
    });
    
    return {
      id: workout.id,
      date: workout.date,
      templateType: workout.template_type,
      notes: workout.notes,
      durationMinutes: workout.duration_minutes,
      caloriesBurned: workout.calories_burned,
      exercises: exercisesWithSets
    };
  });
  
  res.json({ workouts: workoutsWithDetails });
});

// Create a new workout
router.post('/:userId', (req, res) => {
  const { userId } = req.params;
  const { date, templateType, notes, durationMinutes, caloriesBurned, exercises } = req.body;
  
  const workoutId = uuidv4();
  
  const transaction = db.transaction(() => {
    // Insert workout
    db.prepare(`
      INSERT INTO workouts (id, user_id, date, template_type, notes, duration_minutes, calories_burned)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(workoutId, userId, date, templateType, notes, durationMinutes, caloriesBurned);
    
    // Insert exercises and sets
    exercises.forEach((exercise: any, index: number) => {
      const exerciseId = uuidv4();
      
      db.prepare(`
        INSERT INTO workout_exercises (id, workout_id, exercise_id, exercise_name, order_index)
        VALUES (?, ?, ?, ?, ?)
      `).run(exerciseId, workoutId, exercise.exerciseId || exercise.id, exercise.name, index);
      
      // Insert sets
      exercise.sets.forEach((set: any, setIndex: number) => {
        db.prepare(`
          INSERT INTO exercise_sets (id, workout_exercise_id, set_number, reps, weight, completed)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(uuidv4(), exerciseId, setIndex + 1, set.reps, set.weight, set.completed ? 1 : 0);
      });
    });
  });
  
  transaction();
  
  res.json({ 
    workout: {
      id: workoutId,
      date,
      templateType,
      notes,
      durationMinutes,
      caloriesBurned,
      exercises
    }
  });
});

// Update a workout
router.put('/:userId/:workoutId', (req, res) => {
  const { userId, workoutId } = req.params;
  const { date, templateType, notes, durationMinutes, caloriesBurned, exercises } = req.body;
  
  // Check if the workout belongs to the user
  const existing = db.prepare('SELECT * FROM workouts WHERE id = ? AND user_id = ?').get(workoutId, userId);
  
  if (!existing) {
    return res.status(404).json({ error: 'Workout not found' });
  }
  
  const transaction = db.transaction(() => {
    // Update workout
    db.prepare(`
      UPDATE workouts 
      SET date = ?, template_type = ?, notes = ?, duration_minutes = ?, calories_burned = ?
      WHERE id = ?
    `).run(date, templateType, notes, durationMinutes, caloriesBurned, workoutId);
    
    // Delete existing exercises and sets
    const existingExercises = db.prepare('SELECT id FROM workout_exercises WHERE workout_id = ?').all(workoutId) as any[];
    for (const ex of existingExercises) {
      db.prepare('DELETE FROM exercise_sets WHERE workout_exercise_id = ?').run(ex.id);
    }
    db.prepare('DELETE FROM workout_exercises WHERE workout_id = ?').run(workoutId);
    
    // Re-insert exercises and sets
    exercises.forEach((exercise: any, index: number) => {
      const exerciseId = uuidv4();
      
      db.prepare(`
        INSERT INTO workout_exercises (id, workout_id, exercise_id, exercise_name, order_index)
        VALUES (?, ?, ?, ?, ?)
      `).run(exerciseId, workoutId, exercise.exerciseId || exercise.id, exercise.name, index);
      
      exercise.sets.forEach((set: any, setIndex: number) => {
        db.prepare(`
          INSERT INTO exercise_sets (id, workout_exercise_id, set_number, reps, weight, completed)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(uuidv4(), exerciseId, setIndex + 1, set.reps, set.weight, set.completed ? 1 : 0);
      });
    });
  });
  
  transaction();
  
  res.json({ success: true });
});

// Delete a workout
router.delete('/:userId/:workoutId', (req, res) => {
  const { userId, workoutId } = req.params;
  
  const existing = db.prepare('SELECT * FROM workouts WHERE id = ? AND user_id = ?').get(workoutId, userId);
  
  if (!existing) {
    return res.status(404).json({ error: 'Workout not found' });
  }
  
  // Due to CASCADE, deleting the workout will delete exercises and sets
  db.prepare('DELETE FROM workouts WHERE id = ?').run(workoutId);
  
  res.json({ success: true });
});

// Get last workout data for an exercise (for auto-fill)
router.get('/:userId/exercise/:exerciseId/last', (req, res) => {
  const { userId, exerciseId } = req.params;
  
  const lastExercise = db.prepare(`
    SELECT we.*, w.date
    FROM workout_exercises we
    JOIN workouts w ON we.workout_id = w.id
    WHERE w.user_id = ? AND we.exercise_id = ?
    ORDER BY w.date DESC
    LIMIT 1
  `).get(userId, exerciseId) as any;
  
  if (!lastExercise) {
    return res.json({ lastData: null });
  }
  
  const sets = db.prepare(`
    SELECT * FROM exercise_sets WHERE workout_exercise_id = ? ORDER BY set_number
  `).all(lastExercise.id) as any[];
  
  res.json({
    lastData: {
      date: lastExercise.date,
      sets: sets.map(s => ({
        reps: s.reps,
        weight: s.weight
      }))
    }
  });
});

export default router;
