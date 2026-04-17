import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../database.js';

const router = Router();

// Get all cardio sessions for a user
router.get('/:userId', (req, res) => {
  const { userId } = req.params;
  
  const sessions = db.prepare(`
    SELECT * FROM cardio_sessions WHERE user_id = ? ORDER BY date DESC
  `).all(userId) as any[];
  
  const formattedSessions = sessions.map(s => ({
    id: s.id,
    date: s.date,
    type: s.type,
    durationMinutes: s.duration_minutes,
    distanceKm: s.distance_km,
    avgHeartRate: s.avg_heart_rate,
    caloriesBurned: s.calories_burned,
    notes: s.notes
  }));
  
  res.json({ sessions: formattedSessions });
});

// Create a new cardio session
router.post('/:userId', (req, res) => {
  const { userId } = req.params;
  const { date, type, durationMinutes, distanceKm, avgHeartRate, caloriesBurned, notes } = req.body;
  
  const id = uuidv4();
  
  db.prepare(`
    INSERT INTO cardio_sessions (id, user_id, date, type, duration_minutes, distance_km, avg_heart_rate, calories_burned, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, userId, date, type, durationMinutes, distanceKm, avgHeartRate, caloriesBurned, notes);
  
  res.json({
    session: {
      id,
      date,
      type,
      durationMinutes,
      distanceKm,
      avgHeartRate,
      caloriesBurned,
      notes
    }
  });
});

// Update a cardio session
router.put('/:userId/:sessionId', (req, res) => {
  const { userId, sessionId } = req.params;
  const { date, type, durationMinutes, distanceKm, avgHeartRate, caloriesBurned, notes } = req.body;
  
  const existing = db.prepare('SELECT * FROM cardio_sessions WHERE id = ? AND user_id = ?').get(sessionId, userId);
  
  if (!existing) {
    return res.status(404).json({ error: 'Session not found' });
  }
  
  db.prepare(`
    UPDATE cardio_sessions 
    SET date = ?, type = ?, duration_minutes = ?, distance_km = ?, avg_heart_rate = ?, calories_burned = ?, notes = ?
    WHERE id = ?
  `).run(date, type, durationMinutes, distanceKm, avgHeartRate, caloriesBurned, notes, sessionId);
  
  res.json({ success: true });
});

// Delete a cardio session
router.delete('/:userId/:sessionId', (req, res) => {
  const { userId, sessionId } = req.params;
  
  const existing = db.prepare('SELECT * FROM cardio_sessions WHERE id = ? AND user_id = ?').get(sessionId, userId);
  
  if (!existing) {
    return res.status(404).json({ error: 'Session not found' });
  }
  
  db.prepare('DELETE FROM cardio_sessions WHERE id = ?').run(sessionId);
  
  res.json({ success: true });
});

export default router;
