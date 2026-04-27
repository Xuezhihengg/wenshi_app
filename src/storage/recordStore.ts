import { FortuneRecord } from '../domain/types';
import { getDatabase } from './database';

let memoryRecords: FortuneRecord[] = [];
let storageAvailable: boolean | undefined;

export function isPersistentStorageAvailable() {
  return storageAvailable !== false;
}

export async function saveRecord(record: FortuneRecord) {
  try {
    const db = await getDatabase();
    await db.runAsync(
      'INSERT OR REPLACE INTO fortune_records (id, question, createdAt, payload) VALUES (?, ?, ?, ?)',
      record.id,
      record.question,
      record.createdAt,
      JSON.stringify(record)
    );
    storageAvailable = true;
  } catch (error) {
    storageAvailable = false;
    memoryRecords = [record, ...memoryRecords.filter((item) => item.id !== record.id)];
    console.warn('Persistent storage unavailable, record kept in memory only.', error);
  }
}

export async function listRecords(): Promise<FortuneRecord[]> {
  try {
    const db = await getDatabase();
    const rows = await db.getAllAsync<{ payload: string }>('SELECT payload FROM fortune_records ORDER BY createdAt DESC');
    storageAvailable = true;
    return rows.map((row) => JSON.parse(row.payload) as FortuneRecord);
  } catch (error) {
    storageAvailable = false;
    console.warn('Persistent storage unavailable, reading memory records only.', error);
    return memoryRecords;
  }
}
