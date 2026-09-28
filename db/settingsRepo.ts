import { StateStorage } from 'zustand/middleware';
import { getDb } from './client';

export async function getSetting(key: string): Promise<string | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM settings WHERE key = ?', [key]);
  return row?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, value]);
}

export async function removeSetting(key: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM settings WHERE key = ?', [key]);
}

/** Adapts the SQLite settings table to zustand's persist StateStorage, so app settings live in
 * the same database as everything else instead of pulling in AsyncStorage for just this. */
export const sqliteStateStorage: StateStorage = {
  getItem: getSetting,
  setItem: setSetting,
  removeItem: removeSetting,
};
