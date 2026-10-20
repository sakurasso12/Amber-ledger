import * as FileSystem from 'expo-file-system/legacy';
import Constants from 'expo-constants';
import { getDb } from '@/db/client';
import { SCHEMA_VERSION } from '@/db/schema';
import { useTaskStore } from '@/store/useTaskStore';
import { useFinanceStore } from '@/store/useFinanceStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { AppSettings } from '@/types';
import { refreshHomeWidget } from './widgetRefresh';
import { clearProfilePassword, readPasswordRecord, writePasswordRecord } from './password';

/**
 * The data that moves to another phone (QR transfer, see lib/transfer.ts): every table as raw rows
 * plus the settings, as JSON. Not in it: photos (files on this phone) and the profile password
 * (lives in secure storage, never leaves the phone).
 */

const APP_ID = 'amber-ledger';

/** Insert order: tables others point at come first; deleting goes the other way. */
const TABLES = [
  'categories',
  'tasks',
  'subtasks',
  'task_tags',
  'expenses',
  'planned_expenses',
  'recurring_expenses',
  'work_days',
  'spend_plans',
  'plan_spends',
  'accounts',
  'transfers',
  'loans',
] as const;

/** Settings that belong to this phone, not to the data: kept as they are on import. (The profile
 * and its lock settings do move — with the password record below.) */
const DEVICE_SETTINGS: (keyof AppSettings)[] = [
  'profilePasswordSet',
  'financeUnlockedUntil',
  'profileAvatarUri',
  'backgroundImageUri',
  'homeWidgetBackgroundUri',
  'homeWidgetBackgrounds',
  'widgetBackgrounds',
  'streakWidgets',
  'onboardingDone',
  'lastSeenVersion',
];

export interface BackupPayload {
  app: typeof APP_ID;
  schema: number;
  exportedAt: string;
  tables: Record<string, Record<string, unknown>[]>;
  settings: Partial<AppSettings>;
  /** The profile password's salted hash (see lib/password), so the same password works there. */
  passwordRecord?: string | null;
}

export async function buildBackup(): Promise<BackupPayload> {
  const db = await getDb();
  const tables: BackupPayload['tables'] = {};
  for (const table of TABLES) {
    tables[table] = await db.getAllAsync<Record<string, unknown>>(`SELECT * FROM ${table}`);
  }
  const settings: Partial<AppSettings> = { ...useSettingsStore.getState().settings };
  for (const key of DEVICE_SETTINGS) delete settings[key];
  return {
    app: APP_ID,
    schema: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    tables,
    settings,
    passwordRecord: await readPasswordRecord(),
  };
}

export type BackupProblem = 'notBackup' | 'newer';

/** Parses and checks received data; returns the payload or what's wrong with it. */
export function parseBackup(text: string): BackupPayload | BackupProblem {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return 'notBackup';
  }
  const payload = data as BackupPayload;
  if (!payload || payload.app !== APP_ID || typeof payload.tables !== 'object' || !payload.tables) return 'notBackup';
  if (typeof payload.schema !== 'number' || payload.schema > SCHEMA_VERSION) return 'newer';
  return payload;
}

/**
 * Replaces everything on this phone with the received data. Only columns this version knows are written
 * (data from an older version simply leaves new columns at their defaults). Photos from
 * another phone don't exist here, so their links are dropped.
 */
export async function restoreBackup(payload: BackupPayload): Promise<void> {
  const db = await getDb();
  const columnsOf = async (table: string) =>
    new Set((await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`)).map((c) => c.name));

  const missingFiles = new Set<string>();
  for (const row of payload.tables.tasks ?? []) {
    const uri = row.image_uri;
    if (typeof uri === 'string' && !(await FileSystem.getInfoAsync(uri)).exists) missingFiles.add(uri);
  }

  await db.withTransactionAsync(async () => {
    for (const table of [...TABLES].reverse()) await db.runAsync(`DELETE FROM ${table}`);
    for (const table of TABLES) {
      const known = await columnsOf(table);
      for (const row of payload.tables[table] ?? []) {
        const columns = Object.keys(row).filter((c) => known.has(c));
        if (columns.length === 0) continue;
        const values = columns.map((c) => (c === 'image_uri' && missingFiles.has(row[c] as string) ? null : row[c])) as (
          | string
          | number
          | null
        )[];
        await db.runAsync(
          `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`,
          values
        );
      }
    }
  });

  const { settings, updateSettings } = useSettingsStore.getState();
  const imported = { ...payload.settings };
  for (const key of DEVICE_SETTINGS) delete imported[key];
  // The profile comes along: same name, same password (and so the same finance lock).
  const hasPassword = !!payload.passwordRecord;
  if (payload.passwordRecord) await writePasswordRecord(payload.passwordRecord);
  else await clearProfilePassword();
  updateSettings({
    ...imported,
    profilePasswordSet: hasPassword,
    financeLockEnabled: hasPassword && !!imported.financeLockEnabled,
    financeUnlockedUntil: null,
    onboardingDone: true,
    // Coming from another phone during the first launch: nothing "new" to show on top.
    lastSeenVersion: settings.lastSeenVersion ?? Constants.expoConfig?.version ?? null,
  });

  await Promise.all([useTaskStore.getState().load(), useFinanceStore.getState().load()]);
  useTaskStore.getState().resyncAllReminders();
  refreshHomeWidget();
}
