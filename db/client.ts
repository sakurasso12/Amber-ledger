import * as SQLite from 'expo-sqlite';
import { CREATE_TABLES_SQL, DB_NAME, DEFAULT_CATEGORIES, SCHEMA_VERSION } from './schema';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function migrate(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(CREATE_TABLES_SQL);

  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const currentVersion = row?.user_version ?? 0;

  if (currentVersion < 1) {
    const existing = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM categories'
    );
    if (!existing || existing.count === 0) {
      await db.withTransactionAsync(async () => {
        for (const cat of DEFAULT_CATEGORIES) {
          await db.runAsync(
            'INSERT OR IGNORE INTO categories (id, name, color, is_default, sort_order) VALUES (?, ?, ?, 1, ?)',
            [cat.id, cat.name, cat.color, cat.sortOrder]
          );
        }
      });
    }
  }

  if (currentVersion < 2) {
    const columns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(tasks)');
    if (!columns.some((c) => c.name === 'image_uri')) {
      await db.execAsync('ALTER TABLE tasks ADD COLUMN image_uri TEXT');
    }
  }

  if (currentVersion < 3) {
    // planned_expenses / recurring_expenses are new tables — CREATE_TABLES_SQL above already
    // created them for both fresh and existing installs. Only the new column on an existing
    // table needs an explicit ALTER.
    const columns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(categories)');
    if (!columns.some((c) => c.name === 'limit_month')) {
      await db.execAsync('ALTER TABLE categories ADD COLUMN limit_month REAL');
    }
  }

  if (currentVersion < 4) {
    const columns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(tasks)');
    const names = new Set(columns.map((c) => c.name));
    if (!names.has('sort_order')) {
      await db.execAsync('ALTER TABLE tasks ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0');
      // Seed existing rows with their creation order so manual sort starts predictable.
      await db.execAsync(`
        UPDATE tasks SET sort_order = (
          SELECT COUNT(*) FROM tasks t2 WHERE t2.created_at < tasks.created_at
        )
      `);
    }
    if (!names.has('expense_category_id')) {
      await db.execAsync('ALTER TABLE tasks ADD COLUMN expense_category_id TEXT REFERENCES categories(id)');
    }
    if (!names.has('expense_amount')) {
      await db.execAsync('ALTER TABLE tasks ADD COLUMN expense_amount REAL');
    }
  }

  if (currentVersion < 5) {
    const columns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(tasks)');
    if (!columns.some((c) => c.name === 'recurrence_streak')) {
      await db.execAsync('ALTER TABLE tasks ADD COLUMN recurrence_streak INTEGER NOT NULL DEFAULT 0');
    }
  }

  if (currentVersion < 6) {
    // spend_plans / plan_spends are new tables (created above); expenses learn which plan they belong to.
    const columns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(expenses)');
    const names = new Set(columns.map((c) => c.name));
    if (!names.has('plan_id')) await db.execAsync('ALTER TABLE expenses ADD COLUMN plan_id TEXT');
    if (!names.has('plan_role')) await db.execAsync('ALTER TABLE expenses ADD COLUMN plan_role TEXT');
  }

  if (currentVersion < 7) {
    // Expenses logged by completing a task remember the task, so un-doing it takes them back.
    const columns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(expenses)');
    if (!columns.some((c) => c.name === 'task_id')) await db.execAsync('ALTER TABLE expenses ADD COLUMN task_id TEXT');
  }

  if (currentVersion < 8) {
    // accounts / transfers are new tables (created above); expenses remember what paid for them.
    const columns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(expenses)');
    if (!columns.some((c) => c.name === 'account_id')) await db.execAsync('ALTER TABLE expenses ADD COLUMN account_id TEXT');
  }

  if (currentVersion < 9) {
    // Goals keep their target on the account row; loans are a new table (created above).
    const columns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(accounts)');
    if (!columns.some((c) => c.name === 'target')) await db.execAsync('ALTER TABLE accounts ADD COLUMN target REAL');
  }

  if (currentVersion < SCHEMA_VERSION) {
    await db.execAsync(`PRAGMA user_version = ${SCHEMA_VERSION}`);
  }
}

export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync(DB_NAME).then(async (db) => {
      await migrate(db);
      return db;
    });
  }
  return dbPromise;
}
