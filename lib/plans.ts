import { endOfMonth, parseISO } from 'date-fns';
import { PlanSpend, SpendPlan } from '@/types';
import { toDateKey, todayKey } from './dateRanges';

/** Purchases ticked off in the plan's current period. */
export function currentSpends(plan: SpendPlan, spends: PlanSpend[]): PlanSpend[] {
  return spends.filter((s) => s.planId === plan.id && s.period === plan.period);
}

export function spentInPeriod(plan: SpendPlan, spends: PlanSpend[]): number {
  return currentSpends(plan, spends).reduce((sum, s) => sum + s.amount, 0);
}

/** Spent / limit as a fraction: 0.45 = 45 %, above 1 = over the limit. */
export function planRatio(plan: SpendPlan, spent: number): number {
  return plan.limit > 0 ? spent / plan.limit : 0;
}

/** Money spent past the limit — that part is logged as its own red expense. */
export function overspendOf(plan: SpendPlan, spent: number): number {
  return Math.max(0, spent - plan.limit);
}

/**
 * The bar asks "start over or change the budget?" from the last day of the month the period
 * started in — and keeps asking after that until one of the two is picked.
 */
export function needsMonthEndChoice(plan: SpendPlan, today: string = todayKey()): boolean {
  // A plan started on the last day itself isn't asked that same day.
  return today > plan.periodStart && today >= toDateKey(endOfMonth(parseISO(plan.periodStart)));
}
