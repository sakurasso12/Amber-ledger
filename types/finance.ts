import { RecurrenceFreq } from './task';

export interface Category {
  id: string;
  name: string;
  color: string;
  isDefault: boolean;
  sortOrder: number;
  /** Optional monthly spending limit for this category alone — null means no limit. */
  limitMonth: number | null;
}

/** What an expense means for a spending plan: the limit taken off the bank when the plan starts
 * (or a new month begins), or the money spent past that limit. */
export type PlanRole = 'reserve' | 'overspend';

export interface Expense {
  id: string;
  amount: number;
  categoryId: string;
  date: string;
  comment: string | null;
  createdAt: string;
  /** Set when this expense belongs to a spending plan (see SpendPlan). */
  planId: string | null;
  planRole: PlanRole | null;
  /** Logged by completing this task ("log an expense when done") — un-doing or deleting the task
   * takes the expense back. */
  taskId: string | null;
  /** Card or cash it was paid from (see Account). null only in data saved before finance v2 —
   * the v2 migration fills it with the primary account. */
  accountId: string | null;
  /** App-currency value of one unit of the account's currency when it was logged (1 € = 4.3 zł →
   * 4.3); null when the account is in the app currency. Kept per expense so changing the rate later
   * doesn't rewrite old statistics. */
  rate?: number | null;
}

export interface ExpenseDraft {
  amount: number;
  categoryId: string;
  date: string;
  comment: string | null;
  planId?: string | null;
  planRole?: PlanRole | null;
  taskId?: string | null;
  accountId?: string | null;
  rate?: number | null;
}

/**
 * Where money is kept: a bank card or cash in any currency (you can pay with these), a stash — just
 * an amount to keep in mind, e.g. € put aside, nothing is paid from it — a goal: money put aside for
 * something, filling a bar towards `target` — or savings with a yearly rate. Since finance v2 the
 * main card is a row too, marked `isPrimary`.
 */
export type AccountKind = 'card' | 'cash' | 'stash' | 'goal' | 'savings';

export interface Account {
  id: string;
  kind: AccountKind;
  /** Bank name for a card ("PKO", "Revolut"); for cash, empty or whatever the user calls it. */
  name: string;
  /** Shown after amounts: "zł", "€", "$" ... */
  currency: string;
  /** Legacy (before finance v2): balance typed by hand at `setAt`. Read only by the v2 migration,
   * which turns it into an 'opening' adjustment. */
  base: number;
  setAt: string | null;
  /** The account quick-add, salary and new records use by default. Exactly one card has it. */
  isPrimary: boolean;
  /** Savings: yearly interest in percent (null = none / other kinds). */
  ratePercent: number | null;
  /** Savings: yyyy-MM-dd the account or the current deposit term was opened. */
  openedAt: string | null;
  /** Goal: the amount to save up (null for the other kinds). */
  target: number | null;
  sortOrder: number;
  createdAt: string;
}

/** A loan or instalment plan: the monthly payment and what's left are worked out from these. */
export interface Loan {
  id: string;
  name: string;
  principal: number;
  /** Yearly interest in percent (e.g. 9.5). */
  ratePercent: number;
  months: number;
  /** yyyy-MM-dd of the first payment; the next ones fall on the same day of each month. */
  firstPayment: string;
  /** Payments already made ("Paid" pressed). */
  paidCount: number;
  currency: string;
  createdAt: string;
}

/** Money moved between two of the user's accounts (e.g. cash taken out of an ATM). Currencies can
 * differ, so the amount that arrives is kept separately. */
export interface Transfer {
  id: string;
  fromId: string;
  toId: string;
  amount: number;
  amountTo: number;
  date: string;
  createdAt: string;
}

/**
 * A planned expense with a limit ("Food, 800 zł"): the whole limit comes off the bank at once as
 * a 'reserve' expense, then purchases are ticked off against it and fill the bar. Spending past the
 * limit logs an 'overspend' expense. Each month (period) starts over.
 */
export interface SpendPlan {
  id: string;
  name: string;
  categoryId: string;
  limit: number;
  /** Counts up on every reset — purchases belong to one period. */
  period: number;
  /** yyyy-MM-dd the current period started. */
  periodStart: string;
  reserveExpenseId: string | null;
  overspendExpenseId: string | null;
  createdAt: string;
}

/** One purchase ticked off against a plan. */
export interface PlanSpend {
  id: string;
  planId: string;
  period: number;
  amount: number;
  date: string;
  createdAt: string;
}

export interface WorkDay {
  id: string;
  date: string;
  isWorked: boolean;
  hoursOverride: number | null;
  hourlyRateOverride: number | null;
}

export type BudgetPeriod = 'week' | 'month';

export interface CategoryBreakdownEntry {
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  total: number;
  percentage: number;
}

/** A known future expense that hasn't happened yet — subtracted from the "Должно прийти" forecast
 * so the total accounts for money that's already spoken for. */
export interface PlannedExpense {
  id: string;
  amount: number;
  categoryId: string;
  comment: string | null;
  createdAt: string;
}

export interface PlannedExpenseDraft {
  amount: number;
  categoryId: string;
  comment: string | null;
}

/** An expense that logs itself automatically on a schedule (rent, subscriptions, ...). Reuses the
 * same freq/interval/weekdays shape as task recurrence. */
export interface RecurringExpense {
  id: string;
  amount: number;
  categoryId: string;
  comment: string | null;
  freq: RecurrenceFreq;
  interval: number;
  weekdays: number[] | null;
  /** Date key (yyyy-MM-dd) of the next occurrence still to be logged. */
  nextDueDate: string;
  createdAt: string;
}

export interface RecurringExpenseDraft {
  amount: number;
  categoryId: string;
  comment: string | null;
  freq: RecurrenceFreq;
  interval: number;
  weekdays: number[] | null;
  nextDueDate: string;
}

/**
 * Finance v2: a balance is the sum of its records. An adjustment is the record left when the user
 * types in the real balance ('correction': real − what the app had) or when v2 replaced the old
 * "typed-in base" model ('opening'). Nothing is ever recomputed backwards from it.
 */
export interface Adjustment {
  id: string;
  accountId: string;
  amount: number;
  /** yyyy-MM-dd */
  date: string;
  kind: 'opening' | 'correction';
  note: string | null;
  createdAt: string;
}

/** Money in. For now only a confirmed salary (there's no manual "+ income" by design). */
export interface Income {
  id: string;
  accountId: string;
  amount: number;
  date: string;
  /** Pay period key (salaryConfirmations) it was confirmed for. */
  periodKey: string | null;
  createdAt: string;
}

/**
 * Upcoming payment — replaces planned + recurring expenses (and future-dated ones typed in from
 * now on):
 *  - 'date': one payment on `date`;
 *  - 'month': once some time in the month starting `date` (yyyy-MM-01), no exact day;
 *  - 'repeat': on `date`, then by freq/interval/weekdays (date = the next one still to come).
 * When its day comes it waits in "Awaiting answer" (paid / other amount / didn't happen); only then
 * it becomes an expense.
 */
export type UpcomingMode = 'date' | 'month' | 'repeat';

export interface Upcoming {
  id: string;
  amount: number;
  categoryId: string;
  /** null = the primary account. */
  accountId: string | null;
  comment: string | null;
  mode: UpcomingMode;
  date: string;
  freq: RecurrenceFreq | null;
  interval: number;
  weekdays: number[] | null;
  createdAt: string;
}

export type UpcomingDraft = Omit<Upcoming, 'id' | 'createdAt'>;
