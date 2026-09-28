export const DB_NAME = 'amber-ledger.db';

/** Current schema version. Bump this and append a migration when the schema changes. */
export const SCHEMA_VERSION = 4;

export const CREATE_TABLES_SQL = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  deadline_at TEXT,
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'not_started',
  is_important INTEGER NOT NULL DEFAULT 0,
  recurrence_freq TEXT,
  recurrence_interval INTEGER,
  recurrence_weekdays TEXT,
  recurrence_until TEXT,
  series_id TEXT,
  image_uri TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  expense_category_id TEXT REFERENCES categories(id),
  expense_amount REAL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  completed_at TEXT
);

CREATE TABLE IF NOT EXISTS subtasks (
  id TEXT PRIMARY KEY NOT NULL,
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  is_done INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS task_tags (
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  PRIMARY KEY (task_id, tag)
);

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  is_default INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  limit_month REAL
);

CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY NOT NULL,
  amount REAL NOT NULL,
  category_id TEXT NOT NULL REFERENCES categories(id),
  date TEXT NOT NULL,
  comment TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS planned_expenses (
  id TEXT PRIMARY KEY NOT NULL,
  amount REAL NOT NULL,
  category_id TEXT NOT NULL REFERENCES categories(id),
  comment TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS recurring_expenses (
  id TEXT PRIMARY KEY NOT NULL,
  amount REAL NOT NULL,
  category_id TEXT NOT NULL REFERENCES categories(id),
  comment TEXT,
  freq TEXT NOT NULL,
  interval INTEGER NOT NULL DEFAULT 1,
  weekdays TEXT,
  next_due_date TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS work_days (
  id TEXT PRIMARY KEY NOT NULL,
  date TEXT NOT NULL UNIQUE,
  is_worked INTEGER NOT NULL DEFAULT 1,
  hours_override REAL,
  hourly_rate_override REAL
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tasks_deadline ON tasks(deadline_at);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_subtasks_task ON subtasks(task_id);
CREATE INDEX IF NOT EXISTS idx_task_tags_task ON task_tags(task_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
CREATE INDEX IF NOT EXISTS idx_work_days_date ON work_days(date);
CREATE INDEX IF NOT EXISTS idx_recurring_expenses_due ON recurring_expenses(next_due_date);
`;

export const DEFAULT_CATEGORIES: { id: string; name: string; color: string; sortOrder: number }[] = [
  { id: 'cat-food', name: 'Еда', color: '#C1502E', sortOrder: 0 },
  { id: 'cat-transport', name: 'Транспорт', color: '#3E7FB8', sortOrder: 1 },
  { id: 'cat-housing', name: 'Жильё', color: '#8A5CB8', sortOrder: 2 },
  { id: 'cat-fun', name: 'Развлечения', color: '#3E8F5C', sortOrder: 3 },
  { id: 'cat-other', name: 'Прочее', color: '#8A7A64', sortOrder: 4 },
];
