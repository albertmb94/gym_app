import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../database.js';

const router = Router();

// Login/Register user (simple username-only auth)
router.post('/login', (req, res) => {
  const { username } = req.body;
  
  if (!username || username.trim() === '') {
    return res.status(400).json({ error: 'Username is required' });
  }

  const trimmedUsername = username.trim().toLowerCase();
  
  // Check if user exists
  let user = db.prepare('SELECT * FROM users WHERE username = ?').get(trimmedUsername) as any;
  
  if (!user) {
    // Create new user
    const userId = uuidv4();
    db.prepare('INSERT INTO users (id, username) VALUES (?, ?)').run(userId, trimmedUsername);
    
    // Create default settings
    db.prepare('INSERT INTO user_settings (user_id) VALUES (?)').run(userId);
    
    user = { id: userId, username: trimmedUsername };
  }
  
  res.json({ user });
});

// Get user profile
router.get('/:userId/profile', (req, res) => {
  const { userId } = req.params;
  
  const profile = db.prepare('SELECT * FROM user_profiles WHERE user_id = ?').get(userId);
  res.json({ profile: profile || null });
});

// Update user profile
router.put('/:userId/profile', (req, res) => {
  const { userId } = req.params;
  const { height, weight, age, sex, restingHeartRate, maxHeartRate } = req.body;
  
  const existing = db.prepare('SELECT * FROM user_profiles WHERE user_id = ?').get(userId);
  
  if (existing) {
    db.prepare(`
      UPDATE user_profiles 
      SET height = ?, weight = ?, age = ?, sex = ?, resting_heart_rate = ?, max_heart_rate = ?
      WHERE user_id = ?
    `).run(height, weight, age, sex, restingHeartRate, maxHeartRate, userId);
  } else {
    db.prepare(`
      INSERT INTO user_profiles (user_id, height, weight, age, sex, resting_heart_rate, max_heart_rate)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(userId, height, weight, age, sex, restingHeartRate, maxHeartRate);
  }
  
  res.json({ success: true });
});

// Get user settings
router.get('/:userId/settings', (req, res) => {
  const { userId } = req.params;
  
  let settings = db.prepare('SELECT * FROM user_settings WHERE user_id = ?').get(userId) as any;
  
  if (!settings) {
    db.prepare('INSERT INTO user_settings (user_id) VALUES (?)').run(userId);
    settings = { user_id: userId, days_per_week: 3, sets_per_day: 14 };
  }
  
  res.json({ 
    settings: {
      daysPerWeek: settings.days_per_week,
      setsPerDay: settings.sets_per_day
    }
  });
});

// Update user settings
router.put('/:userId/settings', (req, res) => {
  const { userId } = req.params;
  const { daysPerWeek, setsPerDay } = req.body;
  
  db.prepare(`
    UPDATE user_settings SET days_per_week = ?, sets_per_day = ? WHERE user_id = ?
  `).run(daysPerWeek, setsPerDay, userId);
  
  res.json({ success: true });
});

// Get all user data for export
router.get('/:userId/export', (req, res) => {
  const { userId } = req.params;
  
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  const profile = db.prepare('SELECT * FROM user_profiles WHERE user_id = ?').get(userId);
  const settings = db.prepare('SELECT * FROM user_settings WHERE user_id = ?').get(userId);
  const customExercises = db.prepare('SELECT * FROM custom_exercises WHERE user_id = ?').all(userId);
  const templates = db.prepare('SELECT * FROM workout_templates WHERE user_id = ?').all(userId);
  const workouts = db.prepare('SELECT * FROM workouts WHERE user_id = ?').all(userId) as any[];
  const cardioSessions = db.prepare('SELECT * FROM cardio_sessions WHERE user_id = ?').all(userId);
  const weeklyPlan = db.prepare('SELECT * FROM weekly_plan WHERE user_id = ?').all(userId);
  
  // Get exercises and sets for each workout
  const workoutsWithDetails = workouts.map((workout: any) => {
    const exercises = db.prepare('SELECT * FROM workout_exercises WHERE workout_id = ? ORDER BY order_index').all(workout.id) as any[];
    const exercisesWithSets = exercises.map((ex: any) => {
      const sets = db.prepare('SELECT * FROM exercise_sets WHERE workout_exercise_id = ? ORDER BY set_number').all(ex.id);
      return { ...ex, sets };
    });
    return { ...workout, exercises: exercisesWithSets };
  });
  
  res.json({
    user,
    profile,
    settings,
    customExercises,
    templates,
    workouts: workoutsWithDetails,
    cardioSessions,
    weeklyPlan,
    exportDate: new Date().toISOString()
  });
});

// Import user data
router.post('/:userId/import', (req, res) => {
  const { userId } = req.params;
  const data = req.body;
  
  try {
    const transaction = db.transaction(() => {
      // Import profile
      if (data.profile) {
        const existing = db.prepare('SELECT * FROM user_profiles WHERE user_id = ?').get(userId);
        if (existing) {
          db.prepare(`
            UPDATE user_profiles 
            SET height = ?, weight = ?, age = ?, sex = ?, resting_heart_rate = ?, max_heart_rate = ?
            WHERE user_id = ?
          `).run(
            data.profile.height, data.profile.weight, data.profile.age, 
            data.profile.sex, data.profile.resting_heart_rate, data.profile.max_heart_rate, 
            userId
          );
        } else {
          db.prepare(`
            INSERT INTO user_profiles (user_id, height, weight, age, sex, resting_heart_rate, max_heart_rate)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `).run(
            userId, data.profile.height, data.profile.weight, data.profile.age,
            data.profile.sex, data.profile.resting_heart_rate, data.profile.max_heart_rate
          );
        }
      }
      
      // Import custom exercises
      if (data.customExercises) {
        for (const ex of data.customExercises) {
          const existing = db.prepare('SELECT * FROM custom_exercises WHERE id = ?').get(ex.id);
          if (!existing) {
            db.prepare(`
              INSERT INTO custom_exercises (id, user_id, name, primary_muscles, secondary_muscles, image_url)
              VALUES (?, ?, ?, ?, ?, ?)
            `).run(ex.id || uuidv4(), userId, ex.name, ex.primary_muscles, ex.secondary_muscles || '', ex.image_url || '');
          }
        }
      }
      
      // Import templates
      if (data.templates) {
        for (const template of data.templates) {
          const existing = db.prepare('SELECT * FROM workout_templates WHERE id = ?').get(template.id);
          if (!existing) {
            db.prepare(`
              INSERT INTO workout_templates (id, user_id, name, type, exercises)
              VALUES (?, ?, ?, ?, ?)
            `).run(template.id || uuidv4(), userId, template.name, template.type, template.exercises);
          }
        }
      }
      
      // Import workouts
      if (data.workouts) {
        for (const workout of data.workouts) {
          const existing = db.prepare('SELECT * FROM workouts WHERE id = ?').get(workout.id);
          if (!existing) {
            const workoutId = workout.id || uuidv4();
            db.prepare(`
              INSERT INTO workouts (id, user_id, date, template_type, notes, duration_minutes, calories_burned)
              VALUES (?, ?, ?, ?, ?, ?, ?)
            `).run(workoutId, userId, workout.date, workout.template_type, workout.notes, workout.duration_minutes, workout.calories_burned);
            
            // Import exercises
            if (workout.exercises) {
              for (const ex of workout.exercises) {
                const exerciseId = ex.id || uuidv4();
                db.prepare(`
                  INSERT INTO workout_exercises (id, workout_id, exercise_id, exercise_name, order_index)
                  VALUES (?, ?, ?, ?, ?)
                `).run(exerciseId, workoutId, ex.exercise_id, ex.exercise_name, ex.order_index);
                
                // Import sets
                if (ex.sets) {
                  for (const set of ex.sets) {
                    db.prepare(`
                      INSERT INTO exercise_sets (id, workout_exercise_id, set_number, reps, weight, completed)
                      VALUES (?, ?, ?, ?, ?, ?)
                    `).run(set.id || uuidv4(), exerciseId, set.set_number, set.reps, set.weight, set.completed ? 1 : 0);
                  }
                }
              }
            }
          }
        }
      }
      
      // Import cardio sessions
      if (data.cardioSessions) {
        for (const session of data.cardioSessions) {
          const existing = db.prepare('SELECT * FROM cardio_sessions WHERE id = ?').get(session.id);
          if (!existing) {
            db.prepare(`
              INSERT INTO cardio_sessions (id, user_id, date, type, duration_minutes, distance_km, avg_heart_rate, calories_burned, notes)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
              session.id || uuidv4(), userId, session.date, session.type, session.duration_minutes,
              session.distance_km, session.avg_heart_rate, session.calories_burned, session.notes
            );
          }
        }
      }
    });
    
    transaction();
    res.json({ success: true });
  } catch (error) {
    console.error('Import error:', error);
    res.status(500).json({ error: 'Failed to import data' });
  }
});

export default router;
