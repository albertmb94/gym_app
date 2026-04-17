import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDatabase } from './database.js';
import usersRouter from './routes/users.js';
import exercisesRouter from './routes/exercises.js';
import workoutsRouter from './routes/workouts.js';
import cardioRouter from './routes/cardio.js';
import templatesRouter from './routes/templates.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize database
initDatabase();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// API Routes
app.use('/api/users', usersRouter);
app.use('/api/exercises', exercisesRouter);
app.use('/api/workouts', workoutsRouter);
app.use('/api/cardio', cardioRouter);
app.use('/api/templates', templatesRouter);

// Serve static files from the dist folder in production
const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));

// Handle SPA routing - serve index.html for all non-API routes
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(distPath, 'index.html'));
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`API available at http://localhost:${PORT}/api`);
});
