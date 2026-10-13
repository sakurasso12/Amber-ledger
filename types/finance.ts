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
}

export interface ExpenseDraft {
  amount: number;
  categoryId: string;
  date: string;
  comment: string | null;
  planId?: string | null;
  planRole?: PlanRole | null;
  taskId?: string | null;
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
