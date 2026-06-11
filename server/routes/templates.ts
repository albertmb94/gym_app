import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../database.js';

const router = Router();

// Get all templates for a user
router.get('/:userId', (req, res) => {
  const { userId } = req.params;
  
  const templates = db.prepare(`
    SELECT * FROM workout_templates WHERE user_id = ? ORDER BY name
  `).all(userId) as any[];
  
  const formattedTemplates = templates.map(t => ({
    id: t.id,
    name: t.name,
    type: t.type,
    exercises: JSON.parse(t.exercises || '[]')
  }));
  
  res.json({ templates: formattedTemplates });
});

// Create a new template
router.post('/:userId', (req, res) => {
  const { userId } = req.params;
  const { name, type, exercises } = req.body;
  
  const id = uuidv4();
  
  db.prepare(`
    INSERT INTO workout_templates (id, user_id, name, type, exercises)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, userId, name, type, JSON.stringify(exercises || []));
  
  res.json({
    template: {
      id,
      name,
      type,
      exercises: exercises || []
    }
  });
});

// Get weekly plan
// NOTE: must be registered before the generic "/:userId/:templateId" routes,
// otherwise Express matches "weekly-plan" as a :templateId and this never runs.
router.get('/:userId/weekly-plan', (req, res) => {
  const { userId } = req.params;

  const plan = db.prepare(`
    SELECT day_of_week as dayOfWeek, template_id as templateId
    FROM weekly_plan
    WHERE user_id = ?
    ORDER BY day_of_week
  `).all(userId);

  res.json({ plan });
});

// Update weekly plan
router.put('/:userId/weekly-plan', (req, res) => {
  const { userId } = req.params;
  const { plan } = req.body; // Array of { dayOfWeek, templateId }

  const transaction = db.transaction(() => {
    // Clear existing plan
    db.prepare('DELETE FROM weekly_plan WHERE user_id = ?').run(userId);

    // Insert new plan
    for (const day of plan) {
      if (day.templateId) {
        db.prepare(`
          INSERT INTO weekly_plan (id, user_id, day_of_week, template_id)
          VALUES (?, ?, ?, ?)
        `).run(uuidv4(), userId, day.dayOfWeek, day.templateId);
      }
    }
  });

  transaction();

  res.json({ success: true });
});

// Update a template
router.put('/:userId/:templateId', (req, res) => {
  const { userId, templateId } = req.params;
  const { name, type, exercises } = req.body;
  
  const existing = db.prepare('SELECT * FROM workout_templates WHERE id = ? AND user_id = ?').get(templateId, userId);
  
  if (!existing) {
    return res.status(404).json({ error: 'Template not found' });
  }
  
  db.prepare(`
    UPDATE workout_templates 
    SET name = ?, type = ?, exercises = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(name, type, JSON.stringify(exercises || []), templateId);
  
  res.json({ success: true });
});

// Delete a template
router.delete('/:userId/:templateId', (req, res) => {
  const { userId, templateId } = req.params;
  
  const existing = db.prepare('SELECT * FROM workout_templates WHERE id = ? AND user_id = ?').get(templateId, userId);
  
  if (!existing) {
    return res.status(404).json({ error: 'Template not found' });
  }
  
  db.prepare('DELETE FROM workout_templates WHERE id = ?').run(templateId);
  
  res.json({ success: true });
});

export default router;
