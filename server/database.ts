import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '..', 'gym_tracker.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Initialize database tables
export function initDatabase() {
  // Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // User profiles table
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_profiles (
      user_id TEXT PRIMARY KEY,
      height REAL,
      weight REAL,
      age INTEGER,
      sex TEXT,
      resting_heart_rate INTEGER,
      max_heart_rate INTEGER,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Custom exercises table
  db.exec(`
    CREATE TABLE IF NOT EXISTS custom_exercises (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      primary_muscles TEXT NOT NULL,
      secondary_muscles TEXT,
      image_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Workout templates table
  db.exec(`
    CREATE TABLE IF NOT EXISTS workout_templates (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      exercises TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Workouts table
  db.exec(`
    CREATE TABLE IF NOT EXISTS workouts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      date TEXT NOT NULL,
      template_type TEXT,
      notes TEXT,
      duration_minutes INTEGER,
      calories_burned REAL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Workout exercises table
  db.exec(`
    CREATE TABLE IF NOT EXISTS workout_exercises (
      id TEXT PRIMARY KEY,
      workout_id TEXT NOT NULL,
      exercise_id TEXT NOT NULL,
      exercise_name TEXT NOT NULL,
      order_index INTEGER NOT NULL,
      FOREIGN KEY (workout_id) REFERENCES workouts(id) ON DELETE CASCADE
    )
  `);

  // Exercise sets table
  db.exec(`
    CREATE TABLE IF NOT EXISTS exercise_sets (
      id TEXT PRIMARY KEY,
      workout_exercise_id TEXT NOT NULL,
      set_number INTEGER NOT NULL,
      reps INTEGER,
      weight REAL,
      completed INTEGER DEFAULT 0,
      FOREIGN KEY (workout_exercise_id) REFERENCES workout_exercises(id) ON DELETE CASCADE
    )
  `);

  // Cardio sessions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS cardio_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      date TEXT NOT NULL,
      type TEXT NOT NULL,
      duration_minutes INTEGER NOT NULL,
      distance_km REAL,
      avg_heart_rate INTEGER,
      calories_burned REAL,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Weekly plan table
  db.exec(`
    CREATE TABLE IF NOT EXISTS weekly_plan (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      day_of_week INTEGER NOT NULL,
      template_id TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user_id, day_of_week)
    )
  `);

  // User settings table
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_settings (
      user_id TEXT PRIMARY KEY,
      days_per_week INTEGER DEFAULT 3,
      sets_per_day INTEGER DEFAULT 14,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  console.log('Database initialized successfully');
}

export default db;
