import * as SQLite from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import * as schema from './schema';

const expoDb = SQLite.openDatabaseSync('fajrguard.db');
export const db = drizzle(expoDb, { schema });

export async function initializeDatabase(): Promise<void> {
  await expoDb.execAsync(`
    CREATE TABLE IF NOT EXISTS prayers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      prayer_id TEXT NOT NULL,
      scheduled_at INTEGER NOT NULL,
      completed_at INTEGER,
      alarm_duration INTEGER,
      wudu_confidence REAL,
      skipped INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS streak_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      completed_count INTEGER NOT NULL DEFAULT 0,
      total_count INTEGER NOT NULL DEFAULT 5,
      streak_day INTEGER DEFAULT 0
    );
    CREATE UNIQUE INDEX IF NOT EXISTS streak_log_date_unique ON streak_log(date);
  `);
}
