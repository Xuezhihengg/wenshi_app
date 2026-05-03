import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

let database: SQLiteDatabase | null = null;

export async function getDatabase() {
  if (!database) {
    database = await openDatabaseAsync('wenshi.db');
    await database.execAsync(`
      CREATE TABLE IF NOT EXISTS fortune_records (
        id TEXT PRIMARY KEY NOT NULL,
        question TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        payload TEXT NOT NULL
      );
    `);
  }
  return database;
}
