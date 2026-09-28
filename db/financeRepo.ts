import { getDb } from './client';
import { generateId } from '@/lib/id';
import {
  Category,
  Expense,
  ExpenseDraft,
  PlannedExpense,
  PlannedExpenseDraft,
  RecurrenceFreq,
  RecurringExpense,
  RecurringExpenseDraft,
  WorkDay,
} from '@/types';

interface CategoryRow {
  id: string;
  name: string;
  color: string;
  is_default: number;
  sort_order: number;
  limit_month: number | null;
}

interface ExpenseRow {
  id: string;
  amount: number;
  category_id: string;
  date: string;
  comment: string | null;
  created_at: string;
}

interface WorkDayRow {
  id: string;
  date: string;
  is_worked: number;
  hours_override: number | null;
  hourly_rate_override: number | null;
}

function rowToCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    isDefault: row.is_default === 1,
    sortOrder: row.sort_order,
    limitMonth: row.limit_month,
  };
}

function rowToExpense(row: ExpenseRow): Expense {
  return {
    id: row.id,
    amount: row.amount,
    categoryId: row.category_id,
    date: row.date,
    comment: row.comment,
    createdAt: row.created_at,
  };
}

function rowToWorkDay(row: WorkDayRow): WorkDay {
  return {
    id: row.id,
    date: row.date,
    isWorked: row.is_worked === 1,
    hoursOverride: row.hours_override,
    hourlyRateOverride: row.hourly_rate_override,
  };
}

// ---- Categories ----

export async function listCategories(): Promise<Category[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<CategoryRow>('SELECT * FROM categories ORDER BY sort_order ASC');
  return rows.map(rowToCategory);
}

export async function createCategory(name: string, color: string): Promise<Category> {
  const db = await getDb();
  const countRow = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM categories');
  const category: Category = {
    id: generateId(),
    name,
    color,
    isDefault: false,
    sortOrder: countRow?.count ?? 0,
    limitMonth: null,
  };
  await db.runAsync(
    'INSERT INTO categories (id, name, color, is_default, sort_order, limit_month) VALUES (?, ?, ?, 0, ?, ?)',
    [category.id, category.name, category.color, category.sortOrder, category.limitMonth]
  );
  return category;
}

export async function updateCategory(category: Category): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE categories SET name = ?, color = ?, sort_order = ?, limit_month = ? WHERE id = ?', [
    category.name,
    category.color,
    category.sortOrder,
    category.limitMonth,
    category.id,
  ]);
}

export async function countExpensesInCategory(categoryId: string): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM expenses WHERE category_id = ?',
    [categoryId]
  );
  return row?.count ?? 0;
}

/** Throws if the category still has expenses — caller should check countExpensesInCategory first. */
export async function deleteCategory(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM categories WHERE id = ?', [id]);
}

// ---- Expenses ----

export async function listExpenses(): Promise<Expense[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<ExpenseRow>('SELECT * FROM expenses ORDER BY date DESC, created_at DESC');
  return rows.map(rowToExpense);
}

export async function createExpense(draft: ExpenseDraft): Promise<Expense> {
  const db = await getDb();
  const expense: Expense = {
    id: generateId(),
    amount: draft.amount,
    categoryId: draft.categoryId,
    date: draft.date,
    comment: draft.comment,
    createdAt: new Date().toISOString(),
  };
  await db.runAsync(
    'INSERT INTO expenses (id, amount, category_id, date, comment, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    [expense.id, expense.amount, expense.categoryId, expense.date, expense.comment, expense.createdAt]
  );
  return expense;
}

export async function updateExpense(expense: Expense): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE expenses SET amount = ?, category_id = ?, date = ?, comment = ? WHERE id = ?', [
    expense.amount,
    expense.categoryId,
    expense.date,
    expense.comment,
    expense.id,
  ]);
}

export async function deleteExpense(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM expenses WHERE id = ?', [id]);
}

// ---- Work days ----

export async function listWorkDays(): Promise<WorkDay[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<WorkDayRow>('SELECT * FROM work_days ORDER BY date ASC');
  return rows.map(rowToWorkDay);
}

export async function upsertWorkDay(
  date: string,
  isWorked: boolean,
  hoursOverride: number | null = null,
  hourlyRateOverride: number | null = null
): Promise<WorkDay> {
  const db = await getDb();
  const existing = await db.getFirstAsync<WorkDayRow>('SELECT * FROM work_days WHERE date = ?', [date]);

  if (existing) {
    await db.runAsync(
      'UPDATE work_days SET is_worked = ?, hours_override = ?, hourly_rate_override = ? WHERE date = ?',
      [isWorked ? 1 : 0, hoursOverride, hourlyRateOverride, date]
    );
    return { id: existing.id, date, isWorked, hoursOverride, hourlyRateOverride };
  }

  const workDay: WorkDay = { id: generateId(), date, isWorked, hoursOverride, hourlyRateOverride };
  await db.runAsync(
    'INSERT INTO work_days (id, date, is_worked, hours_override, hourly_rate_override) VALUES (?, ?, ?, ?, ?)',
    [workDay.id, date, isWorked ? 1 : 0, hoursOverride, hourlyRateOverride]
  );
  return workDay;
}

export async function deleteWorkDay(date: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM work_days WHERE date = ?', [date]);
}

// ---- Planned expenses ----

interface PlannedExpenseRow {
  id: string;
  amount: number;
  category_id: string;
  comment: string | null;
  created_at: string;
}

function rowToPlannedExpense(row: PlannedExpenseRow): PlannedExpense {
  return { id: row.id, amount: row.amount, categoryId: row.category_id, comment: row.comment, createdAt: row.created_at };
}

export async function listPlannedExpenses(): Promise<PlannedExpense[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<PlannedExpenseRow>('SELECT * FROM planned_expenses ORDER BY created_at DESC');
  return rows.map(rowToPlannedExpense);
}

export async function createPlannedExpense(draft: PlannedExpenseDraft): Promise<PlannedExpense> {
  const db = await getDb();
  const item: PlannedExpense = {
    id: generateId(),
    amount: draft.amount,
    categoryId: draft.categoryId,
    comment: draft.comment,
    createdAt: new Date().toISOString(),
  };
  await db.runAsync(
    'INSERT INTO planned_expenses (id, amount, category_id, comment, created_at) VALUES (?, ?, ?, ?, ?)',
    [item.id, item.amount, item.categoryId, item.comment, item.createdAt]
  );
  return item;
}

export async function deletePlannedExpense(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM planned_expenses WHERE id = ?', [id]);
}

// ---- Recurring expenses ----

interface RecurringExpenseRow {
  id: string;
  amount: number;
  category_id: string;
  comment: string | null;
  freq: string;
  interval: number;
  weekdays: string | null;
  next_due_date: string;
  created_at: string;
}

function rowToRecurringExpense(row: RecurringExpenseRow): RecurringExpense {
  return {
    id: row.id,
    amount: row.amount,
    categoryId: row.category_id,
    comment: row.comment,
    freq: row.freq as RecurrenceFreq,
    interval: row.interval,
    weekdays: row.weekdays ? JSON.parse(row.weekdays) : null,
    nextDueDate: row.next_due_date,
    createdAt: row.created_at,
  };
}

export async function listRecurringExpenses(): Promise<RecurringExpense[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<RecurringExpenseRow>('SELECT * FROM recurring_expenses ORDER BY next_due_date ASC');
  return rows.map(rowToRecurringExpense);
}

export async function createRecurringExpense(draft: RecurringExpenseDraft): Promise<RecurringExpense> {
  const db = await getDb();
  const item: RecurringExpense = {
    id: generateId(),
    amount: draft.amount,
    categoryId: draft.categoryId,
    comment: draft.comment,
    freq: draft.freq,
    interval: draft.interval,
    weekdays: draft.weekdays,
    nextDueDate: draft.nextDueDate,
    createdAt: new Date().toISOString(),
  };
  await db.runAsync(
    `INSERT INTO recurring_expenses
      (id, amount, category_id, comment, freq, interval, weekdays, next_due_date, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      item.id,
      item.amount,
      item.categoryId,
      item.comment,
      item.freq,
      item.interval,
      item.weekdays ? JSON.stringify(item.weekdays) : null,
      item.nextDueDate,
      item.createdAt,
    ]
  );
  return item;
}

export async function updateRecurringExpenseNextDue(id: string, nextDueDate: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE recurring_expenses SET next_due_date = ? WHERE id = ?', [nextDueDate, id]);
}

export async function deleteRecurringExpense(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM recurring_expenses WHERE id = ?', [id]);
}
