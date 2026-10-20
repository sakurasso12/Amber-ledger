import { Category, CategoryBreakdownEntry, Expense } from '@/types';
import { DateRange, isDateKeyInRange, parseDateKey, todayKey } from './dateRanges';

export function filterByRange(expenses: Expense[], range?: DateRange): Expense[] {
  return range ? expenses.filter((e) => isDateKeyInRange(e.date, range)) : expenses;
}

export function totalExpenses(expenses: Expense[], range?: DateRange): number {
  return filterByRange(expenses, range).reduce((sum, e) => sum + e.amount, 0);
}

export function categoryBreakdown(
  expenses: Expense[],
  categories: Category[],
  range?: DateRange
): CategoryBreakdownEntry[] {
  const scoped = filterByRange(expenses, range);
  const total = scoped.reduce((sum, e) => sum + e.amount, 0);

  const totalsByCategory = new Map<string, number>();
  for (const expense of scoped) {
    totalsByCategory.set(expense.categoryId, (totalsByCategory.get(expense.categoryId) ?? 0) + expense.amount);
  }

  return categories
    .map((category) => {
      const categoryTotal = totalsByCategory.get(category.id) ?? 0;
      return {
        categoryId: category.id,
        categoryName: category.name,
        categoryColor: category.color,
        total: categoryTotal,
        percentage: total > 0 ? (categoryTotal / total) * 100 : 0,
      };
    })
    .filter((entry) => entry.total > 0)
    .sort((a, b) => b.total - a.total);
}

export function topCategory(
  expenses: Expense[],
  categories: Category[],
  range?: DateRange
): CategoryBreakdownEntry | null {
  const breakdown = categoryBreakdown(expenses, categories, range);
  return breakdown[0] ?? null;
}

/**
 * When an expense comes off a balance: when it was logged — or, for one dated in the future, at
 * the start of that day (rent for the 30th leaves the card on the 30th, not when it was typed in).
 */
export function chargedAt(expense: Expense): string {
  const dayStart = parseDateKey(expense.date).toISOString();
  return dayStart > expense.createdAt ? dayStart : expense.createdAt;
}

/** Has the expense's day come? Until then it isn't taken off any balance. */
export function isDue(expense: Expense, today: string = todayKey()): boolean {
  return expense.date <= today;
}

/** Is the expense part of a balance that was typed in at `setAt` (null = never typed in)? */
export function countsInBalance(expense: Expense, setAt: string | null, today: string = todayKey()): boolean {
  return isDue(expense, today) && (!setAt || chargedAt(expense) > setAt);
}

export interface BankBalance {
  /** Cash on hand: the manually-set base, minus everything spent since it was set. */
  bank: number;
  spentSinceSet: number;
}

/**
 * "Банк" is a manual figure the user sets to match reality (e.g. their actual bank app balance),
 * not something derived from the work calendar. Every expense charged after `setAt` is subtracted
 * automatically (see countsInBalance); `setAt: null` means the base has never been set, so every
 * expense ever logged counts against it. Pass the main card's expenses only.
 */
export function computeBankBalance(
  expenses: Expense[],
  base: number,
  setAt: string | null,
  today: string = todayKey()
): BankBalance {
  const relevant = expenses.filter((e) => countsInBalance(e, setAt, today));
  const spentSinceSet = relevant.reduce((sum, e) => sum + e.amount, 0);
  return { bank: base - spentSinceSet, spentSinceSet };
}
