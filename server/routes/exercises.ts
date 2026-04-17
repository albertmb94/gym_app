import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../database.js';

const router = Router();

// Get all custom exercises for a user
router.get('/:userId', (req, res) => {
  const { userId } = req.params;
  
  const exercises = db.prepare(`
    SELECT id, name, primary_muscles as primaryMuscles, secondary_muscles as secondaryMuscles, image_url as imageUrl
    FROM custom_exercises 
    WHERE user_id = ?
    ORDER BY name
  `).all(userId);
  
  // Parse muscles from JSON strings
  const parsedExercises = (exercises as any[]).map(ex => ({
    ...ex,
    primaryMuscles: JSON.parse(ex.primaryMuscles || '[]'),
    secondaryMuscles: JSON.parse(ex.secondaryMuscles || '[]'),
    isCustom: true
  }));
  
  res.json({ exercises: parsedExercises });
});

// Create a new custom exercise
router.post('/:userId', (req, res) => {
  const { userId } = req.params;
  const { name, primaryMuscles, secondaryMuscles, imageUrl } = req.body;
  
  if (!name || !primaryMuscles || primaryMuscles.length === 0) {
    return res.status(400).json({ error: 'Name and at least one primary muscle are required' });
  }
  
  const id = uuidv4();
  
  db.prepare(`
    INSERT INTO custom_exercises (id, user_id, name, primary_muscles, secondary_muscles, image_url)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, userId, name, JSON.stringify(primaryMuscles), JSON.stringify(secondaryMuscles || []), imageUrl || '');
  
  res.json({ 
    exercise: {
      id,
      name,
      primaryMuscles,
      secondaryMuscles: secondaryMuscles || [],
      imageUrl: imageUrl || '',
      isCustom: true
    }
  });
});

// Update a custom exercise
router.put('/:userId/:exerciseId', (req, res) => {
  const { userId, exerciseId } = req.params;
  const { name, primaryMuscles, secondaryMuscles, imageUrl } = req.body;
  
  // Check if the exercise belongs to the user
  const existing = db.prepare('SELECT * FROM custom_exercises WHERE id = ? AND user_id = ?').get(exerciseId, userId);
  
  if (!existing) {
    return res.status(404).json({ error: 'Exercise not found or not owned by user' });
  }
  
  db.prepare(`
    UPDATE custom_exercises 
    SET name = ?, primary_muscles = ?, secondary_muscles = ?, image_url = ?
    WHERE id = ? AND user_id = ?
  `).run(name, JSON.stringify(primaryMuscles), JSON.stringify(secondaryMuscles || []), imageUrl || '', exerciseId, userId);
  
  res.json({ 
    exercise: {
      id: exerciseId,
      name,
      primaryMuscles,
      secondaryMuscles: secondaryMuscles || [],
      imageUrl: imageUrl || '',
      isCustom: true
    }
  });
});

// Delete a custom exercise
router.delete('/:userId/:exerciseId', (req, res) => {
  const { userId, exerciseId } = req.params;
  
  // Check if the exercise belongs to the user
  const existing = db.prepare('SELECT * FROM custom_exercises WHERE id = ? AND user_id = ?').get(exerciseId, userId);
  
  if (!existing) {
    return res.status(404).json({ error: 'Exercise not found or not owned by user' });
  }
  
  db.prepare('DELETE FROM custom_exercises WHERE id = ? AND user_id = ?').run(exerciseId, userId);
  
  res.json({ success: true });
});

export default router;
