import { FortuneRecord } from '../domain/types';
import { apiBaseUrl } from '../api/client';
import { listRemoteRecords, saveRemoteRecord, toggleRemoteFavorite } from '../api/records';
import { getDatabase } from './database';

let memoryRecords: FortuneRecord[] = [];
let storageAvailable: boolean | undefined;

export function isPersistentStorageAvailable() {
  return storageAvailable !== false;
}

export async function saveRecord(record: FortuneRecord) {
  try {
    const remoteRecord = await saveRemoteRecord(record);
    await saveLocalRecord(remoteRecord);
    storageAvailable = true;
    return remoteRecord;
  } catch (error) {
    console.warn(`Remote record save unavailable at ${apiBaseUrl()}, falling back to local storage.`, error);
    return saveLocalRecord(record);
  }
}

async function saveLocalRecord(record: FortuneRecord) {
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
  return record;
}

export async function listRecords(): Promise<FortuneRecord[]> {
  try {
    const remoteRecords = await listRemoteRecords();
    await Promise.all(remoteRecords.map(saveLocalRecord));
    storageAvailable = true;
    return remoteRecords;
  } catch (error) {
    console.warn(`Remote records unavailable at ${apiBaseUrl()}, falling back to local storage.`, error);
    return listLocalRecords();
  }
}

async function listLocalRecords(): Promise<FortuneRecord[]> {
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

export async function toggleRecordFavorite(record: FortuneRecord) {
  try {
    const remoteRecord = await toggleRemoteFavorite(record);
    await saveLocalRecord(remoteRecord);
    storageAvailable = true;
    return remoteRecord;
  } catch (error) {
    console.warn(`Remote favorite toggle unavailable at ${apiBaseUrl()}, falling back to local storage.`, error);
    const updatedRecord = { ...record, favorite: !record.favorite };
    return saveLocalRecord(updatedRecord);
  }
}
