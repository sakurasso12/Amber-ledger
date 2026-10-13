import { endOfMonth, parseISO } from 'date-fns';
import { Expense, PlanSpend, SpendPlan } from '@/types';
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

/**
 * Expenses as spending: a plan's records (the limit taken off at once, the overspend) are swapped
 * for the purchases actually ticked off in it. Stats, the week/month totals and budget alerts use
 * this — a 800 zł food plan with 300 zł bought is 300 zł of food, not 800. The bank still counts
 * the whole limit (that's the point of a plan).
 */
export function spendingExpenses(expenses: Expense[], plans: SpendPlan[], spends: PlanSpend[]): Expense[] {
  if (plans.length === 0) return expenses;
  const byId = new Map(plans.map((p) => [p.id, p]));
  const own = expenses.filter((e) => !(e.planRole && e.planId && byId.has(e.planId)));
  const purchases: Expense[] = [];
  for (const s of spends) {
    const plan = byId.get(s.planId);
    if (!plan) continue;
    purchases.push({
      id: `spend-${s.id}`,
      amount: s.amount,
      categoryId: plan.categoryId,
      date: s.date,
      comment: plan.name,
      createdAt: s.createdAt,
      planId: plan.id,
      planRole: null,
      taskId: null,
    });
  }
  return [...own, ...purchases];
}

/** The part of the plans' limits not spent yet this period — still physically in the account. */
export function unspentInPlans(plans: SpendPlan[], spends: PlanSpend[]): number {
  return plans.reduce((sum, p) => sum + (p.reserveExpenseId ? Math.max(0, p.limit - spentInPeriod(p, spends)) : 0), 0);
}
