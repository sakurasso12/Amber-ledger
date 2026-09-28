import { Category, CategoryBreakdownEntry, Expense } from '@/types';
import { DateRange, isDateKeyInRange } from './dateRanges';

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

export interface BankBalance {
  /** Cash on hand: the manually-set base, minus everything spent since it was set. */
  bank: number;
  spentSinceSet: number;
}

/**
 * "Банк" is a manual figure the user sets to match reality (e.g. their actual bank app balance),
 * not something derived from the work calendar. Every expense logged after `setAt` is subtracted
 * automatically; `setAt: null` means the base has never been set, so every expense ever logged
 * counts against it.
 */
export function computeBankBalance(expenses: Expense[], base: number, setAt: string | null): BankBalance {
  const relevant = setAt ? expenses.filter((e) => e.createdAt > setAt) : expenses;
  const spentSinceSet = relevant.reduce((sum, e) => sum + e.amount, 0);
  return { bank: base - spentSinceSet, spentSinceSet };
}
