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

export interface Expense {
  id: string;
  amount: number;
  categoryId: string;
  date: string;
  comment: string | null;
  createdAt: string;
}

export interface ExpenseDraft {
  amount: number;
  categoryId: string;
  date: string;
  comment: string | null;
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
