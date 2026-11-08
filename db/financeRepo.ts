import { getDb } from './client';
import { generateId } from '@/lib/id';
import {
  Account,
  AccountKind,
  Adjustment,
  Income,
  Upcoming,
  UpcomingMode,
  Loan,
  Category,
  Expense,
  ExpenseDraft,
  PlannedExpense,
  PlannedExpenseDraft,
  PlanRole,
  PlanSpend,
  SpendPlan,
  RecurrenceFreq,
  RecurringExpense,
  RecurringExpenseDraft,
  Transfer,
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
  plan_id: string | null;
  plan_role: string | null;
  task_id: string | null;
  account_id: string | null;
  rate?: number | null;
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
    planId: row.plan_id ?? null,
    planRole: (row.plan_role as PlanRole | null) ?? null,
    taskId: row.task_id ?? null,
    accountId: row.account_id ?? null,
    rate: row.rate ?? null,
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
    planId: draft.planId ?? null,
    planRole: draft.planRole ?? null,
    taskId: draft.taskId ?? null,
    accountId: draft.accountId ?? null,
    rate: draft.rate ?? null,
  };
  await insertExpense(expense);
  return expense;
}

/** Inserts the expense as it is (id and created time included), or rewrites an existing one. */
export async function insertExpense(expense: Expense): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'INSERT OR REPLACE INTO expenses (id, amount, category_id, date, comment, created_at, plan_id, plan_role, task_id, account_id, rate) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [
      expense.id,
      expense.amount,
      expense.categoryId,
      expense.date,
      expense.comment,
      expense.createdAt,
      expense.planId,
      expense.planRole,
      expense.taskId,
      expense.accountId,
      expense.rate ?? null,
    ]
  );
}

export async function updateExpense(expense: Expense): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'UPDATE expenses SET amount = ?, category_id = ?, date = ?, comment = ?, plan_id = ?, plan_role = ?, account_id = ?, rate = ? WHERE id = ?',
    [expense.amount, expense.categoryId, expense.date, expense.comment, expense.planId, expense.planRole, expense.accountId, expense.rate ?? null, expense.id]
  );
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

// ---- Spending plans ----

interface SpendPlanRow {
  id: string;
  name: string;
  category_id: string;
  limit_amount: number;
  period: number;
  period_start: string;
  reserve_expense_id: string | null;
  overspend_expense_id: string | null;
  created_at: string;
}

interface PlanSpendRow {
  id: string;
  plan_id: string;
  period: number;
  amount: number;
  date: string;
  created_at: string;
}

function rowToSpendPlan(row: SpendPlanRow): SpendPlan {
  return {
    id: row.id,
    name: row.name,
    categoryId: row.category_id,
    limit: row.limit_amount,
    period: row.period,
    periodStart: row.period_start,
    reserveExpenseId: row.reserve_expense_id,
    overspendExpenseId: row.overspend_expense_id,
    createdAt: row.created_at,
  };
}

function rowToPlanSpend(row: PlanSpendRow): PlanSpend {
  return { id: row.id, planId: row.plan_id, period: row.period, amount: row.amount, date: row.date, createdAt: row.created_at };
}

export async function listSpendPlans(): Promise<SpendPlan[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<SpendPlanRow>('SELECT * FROM spend_plans ORDER BY created_at ASC');
  return rows.map(rowToSpendPlan);
}

export async function listPlanSpends(): Promise<PlanSpend[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<PlanSpendRow>('SELECT * FROM plan_spends ORDER BY date DESC, created_at DESC');
  return rows.map(rowToPlanSpend);
}

/** Inserts the plan, or rewrites every field of an existing one. */
export async function saveSpendPlan(plan: SpendPlan): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT OR REPLACE INTO spend_plans
      (id, name, category_id, limit_amount, period, period_start, reserve_expense_id, overspend_expense_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      plan.id,
      plan.name,
      plan.categoryId,
      plan.limit,
      plan.period,
      plan.periodStart,
      plan.reserveExpenseId,
      plan.overspendExpenseId,
      plan.createdAt,
    ]
  );
}

/** Removes the plan and its purchases. Its expenses stay in the history as they are. */
export async function deleteSpendPlan(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM plan_spends WHERE plan_id = ?', [id]);
  await db.runAsync('DELETE FROM spend_plans WHERE id = ?', [id]);
}

export async function createPlanSpend(planId: string, period: number, amount: number, date: string): Promise<PlanSpend> {
  const db = await getDb();
  const spend: PlanSpend = { id: generateId(), planId, period, amount, date, createdAt: new Date().toISOString() };
  await db.runAsync('INSERT INTO plan_spends (id, plan_id, period, amount, date, created_at) VALUES (?, ?, ?, ?, ?, ?)', [
    spend.id,
    spend.planId,
    spend.period,
    spend.amount,
    spend.date,
    spend.createdAt,
  ]);
  return spend;
}

export async function deletePlanSpend(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM plan_spends WHERE id = ?', [id]);
}

// ---- Accounts (cards besides the main one, cash) ----

interface AccountRow {
  id: string;
  kind: string;
  name: string;
  currency: string;
  base: number;
  set_at: string | null;
  target: number | null;
  sort_order: number;
  created_at: string;
  is_primary?: number | null;
  rate_percent?: number | null;
  opened_at?: string | null;
}

function rowToAccount(row: AccountRow): Account {
  return {
    id: row.id,
    kind: row.kind as AccountKind,
    name: row.name,
    currency: row.currency,
    base: row.base,
    setAt: row.set_at,
    target: row.target ?? null,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    isPrimary: row.is_primary === 1,
    ratePercent: row.rate_percent ?? null,
    openedAt: row.opened_at ?? null,
  };
}

export async function listAccounts(): Promise<Account[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<AccountRow>('SELECT * FROM accounts ORDER BY sort_order ASC, created_at ASC');
  return rows.map(rowToAccount);
}

/** Inserts the account, or rewrites every field of an existing one. */
export async function saveAccount(account: Account): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'INSERT OR REPLACE INTO accounts (id, kind, name, currency, base, set_at, target, sort_order, created_at, is_primary, rate_percent, opened_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [
      account.id,
      account.kind,
      account.name,
      account.currency,
      account.base,
      account.setAt,
      account.target,
      account.sortOrder,
      account.createdAt,
      account.isPrimary ? 1 : 0,
      account.ratePercent ?? null,
      account.openedAt ?? null,
    ]
  );
}

/** Removes the account. Its expenses and transfers stay in the history (so the other side of a
 * transfer keeps its money — finance v2 balances are sums of records). */
export async function deleteAccount(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM accounts WHERE id = ?', [id]);
}

// ---- Transfers ----

interface TransferRow {
  id: string;
  from_id: string;
  to_id: string;
  amount: number;
  amount_to: number;
  date: string;
  created_at: string;
}

function rowToTransfer(row: TransferRow): Transfer {
  return {
    id: row.id,
    fromId: row.from_id,
    toId: row.to_id,
    amount: row.amount,
    amountTo: row.amount_to,
    date: row.date,
    createdAt: row.created_at,
  };
}

export async function listTransfers(): Promise<Transfer[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<TransferRow>('SELECT * FROM transfers ORDER BY date DESC, created_at DESC');
  return rows.map(rowToTransfer);
}

export async function createTransfer(draft: Omit<Transfer, 'id' | 'createdAt'>): Promise<Transfer> {
  const transfer: Transfer = { ...draft, id: generateId(), createdAt: new Date().toISOString() };
  await saveTransfer(transfer);
  return transfer;
}

/** Inserts the transfer as it is, or rewrites an existing one. */
export async function saveTransfer(transfer: Transfer): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'INSERT OR REPLACE INTO transfers (id, from_id, to_id, amount, amount_to, date, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [transfer.id, transfer.fromId, transfer.toId, transfer.amount, transfer.amountTo, transfer.date, transfer.createdAt]
  );
}

export async function deleteTransfer(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM transfers WHERE id = ?', [id]);
}

// ---- Loans ----

interface LoanRow {
  id: string;
  name: string;
  principal: number;
  rate_percent: number;
  months: number;
  first_payment: string;
  paid_count: number;
  currency: string;
  created_at: string;
}

function rowToLoan(row: LoanRow): Loan {
  return {
    id: row.id,
    name: row.name,
    principal: row.principal,
    ratePercent: row.rate_percent,
    months: row.months,
    firstPayment: row.first_payment,
    paidCount: row.paid_count,
    currency: row.currency,
    createdAt: row.created_at,
  };
}

export async function listLoans(): Promise<Loan[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<LoanRow>('SELECT * FROM loans ORDER BY created_at ASC');
  return rows.map(rowToLoan);
}

/** Inserts the loan, or rewrites every field of an existing one. */
export async function saveLoan(loan: Loan): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT OR REPLACE INTO loans
      (id, name, principal, rate_percent, months, first_payment, paid_count, currency, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [loan.id, loan.name, loan.principal, loan.ratePercent, loan.months, loan.firstPayment, loan.paidCount, loan.currency, loan.createdAt]
  );
}

export async function deleteLoan(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM loans WHERE id = ?', [id]);
}

// ---- Finance v2: adjustments, incomes, upcoming payments ----

interface AdjustmentRow {
  id: string;
  account_id: string;
  amount: number;
  date: string;
  kind: string;
  note: string | null;
  created_at: string;
}

export async function listAdjustments(): Promise<Adjustment[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<AdjustmentRow>('SELECT * FROM adjustments ORDER BY date DESC, created_at DESC');
  return rows.map((r) => ({
    id: r.id,
    accountId: r.account_id,
    amount: r.amount,
    date: r.date,
    kind: r.kind === 'opening' ? 'opening' : 'correction',
    note: r.note,
    createdAt: r.created_at,
  }));
}

export async function saveAdjustment(a: Adjustment): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'INSERT OR REPLACE INTO adjustments (id, account_id, amount, date, kind, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [a.id, a.accountId, a.amount, a.date, a.kind, a.note, a.createdAt]
  );
}

export async function deleteAdjustmentsOf(accountId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM adjustments WHERE account_id = ?', [accountId]);
}

interface IncomeRow {
  id: string;
  account_id: string;
  amount: number;
  date: string;
  period_key: string | null;
  created_at: string;
}

export async function listIncomes(): Promise<Income[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<IncomeRow>('SELECT * FROM incomes ORDER BY date DESC, created_at DESC');
  return rows.map((r) => ({
    id: r.id,
    accountId: r.account_id,
    amount: r.amount,
    date: r.date,
    periodKey: r.period_key,
    createdAt: r.created_at,
  }));
}

export async function saveIncome(i: Income): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'INSERT OR REPLACE INTO incomes (id, account_id, amount, date, period_key, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    [i.id, i.accountId, i.amount, i.date, i.periodKey, i.createdAt]
  );
}

export async function deleteIncome(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM incomes WHERE id = ?', [id]);
}

interface UpcomingRow {
  id: string;
  amount: number;
  category_id: string;
  account_id: string | null;
  comment: string | null;
  mode: string;
  date: string;
  freq: string | null;
  interval: number;
  weekdays: string | null;
  created_at: string;
}

export async function listUpcoming(): Promise<Upcoming[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<UpcomingRow>('SELECT * FROM upcoming ORDER BY date ASC, created_at ASC');
  return rows.map((r) => ({
    id: r.id,
    amount: r.amount,
    categoryId: r.category_id,
    accountId: r.account_id,
    comment: r.comment,
    mode: r.mode as UpcomingMode,
    date: r.date,
    freq: (r.freq as RecurrenceFreq | null) ?? null,
    interval: r.interval,
    weekdays: r.weekdays ? (JSON.parse(r.weekdays) as number[]) : null,
    createdAt: r.created_at,
  }));
}

export async function saveUpcoming(u: Upcoming): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'INSERT OR REPLACE INTO upcoming (id, amount, category_id, account_id, comment, mode, date, freq, interval, weekdays, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [u.id, u.amount, u.categoryId, u.accountId, u.comment, u.mode, u.date, u.freq, u.interval, u.weekdays ? JSON.stringify(u.weekdays) : null, u.createdAt]
  );
}

export async function deleteUpcoming(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM upcoming WHERE id = ?', [id]);
}

/** Finance v2 migration: everything written in one transaction (see lib/financeMigration.ts). */
export async function applyFinanceMigration(out: {
  accounts: Account[];
  expensesUpsert: Expense[];
  expensesDelete: string[];
  transfers: Transfer[];
  adjustments: Adjustment[];
  incomes: Income[];
  upcoming: Upcoming[];
  categories: Category[];
}): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    for (const a of out.accounts) await saveAccount(a);
    for (const id of out.expensesDelete) await db.runAsync('DELETE FROM expenses WHERE id = ?', [id]);
    for (const e of out.expensesUpsert) await insertExpense(e);
    for (const t of out.transfers) await saveTransfer(t);
    for (const a of out.adjustments) await saveAdjustment(a);
    for (const i of out.incomes) await saveIncome(i);
    for (const u of out.upcoming) await saveUpcoming(u);
    for (const c of out.categories) await updateCategory(c);
    await db.execAsync('DELETE FROM plan_spends; DELETE FROM spend_plans; DELETE FROM planned_expenses; DELETE FROM recurring_expenses;');
  });
}
