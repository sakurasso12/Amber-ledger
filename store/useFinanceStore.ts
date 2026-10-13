import { create } from 'zustand';
import * as financeRepo from '@/db/financeRepo';
import { todayKey } from '@/lib/dateRanges';
import { nextOccurrenceDateKey } from '@/lib/recurrence';
import { checkBudgetAlerts } from '@/notifications';
import { useMemo } from 'react';
import { startOfMonth } from 'date-fns';
import { overspendOf, spendingExpenses, spentInPeriod } from '@/lib/plans';
import { toDateKey } from '@/lib/dateRanges';
import { generateId } from '@/lib/id';
import { useSettingsStore } from './useSettingsStore';
import {
  Category,
  Expense,
  ExpenseDraft,
  PlannedExpenseDraft,
  PlannedExpense,
  PlanSpend,
  RecurringExpense,
  SpendPlan,
  RecurringExpenseDraft,
  WorkDay,
} from '@/types';

interface FinanceState {
  expenses: Expense[];
  categories: Category[];
  workDays: WorkDay[];
  plannedExpenses: PlannedExpense[];
  recurringExpenses: RecurringExpense[];
  spendPlans: SpendPlan[];
  planSpends: PlanSpend[];
  isLoaded: boolean;

  load: () => Promise<void>;

  addExpense: (draft: ExpenseDraft) => Promise<void>;
  editExpense: (expense: Expense) => Promise<void>;
  removeExpense: (id: string) => Promise<void>;

  addCategory: (name: string, color: string) => Promise<void>;
  editCategory: (category: Category) => Promise<void>;
  removeCategory: (id: string) => Promise<{ ok: boolean; expenseCount: number }>;

  setWorkDay: (
    date: string,
    isWorked: boolean,
    hoursOverride?: number | null,
    hourlyRateOverride?: number | null
  ) => Promise<void>;
  toggleWorkedToday: () => Promise<void>;
  clearWorkDay: (date: string) => Promise<void>;

  addPlannedExpense: (draft: PlannedExpenseDraft) => Promise<void>;
  removePlannedExpense: (id: string) => Promise<void>;

  addRecurringExpense: (draft: RecurringExpenseDraft) => Promise<void>;
  removeRecurringExpense: (id: string) => Promise<void>;
  /** Logs any recurring expenses whose next occurrence has arrived as real expenses, advancing
   * their schedule. Call once at app startup. Caps catch-up at 24 occurrences per definition so a
   * long-untouched recurrence can't flood history if the app wasn't opened for a long time. */
  syncRecurringExpenses: () => Promise<void>;

  /** New plan: the whole limit comes off the bank at once as its 'reserve' expense. */
  createSpendPlan: (draft: { name: string; categoryId: string; limit: number; date: string }) => Promise<void>;
  /** A purchase against the plan; past the limit the extra is logged as an 'overspend' expense. */
  addPlanSpend: (planId: string, amount: number) => Promise<void>;
  removePlanSpend: (spendId: string) => Promise<void>;
  /** Rename and/or change the limit of the current period (the reserve follows the limit). */
  updateSpendPlan: (planId: string, patch: { name?: string; limit?: number }) => Promise<void>;
  /** New period: the (new) limit comes off the bank again and the bar starts from 0 %. The old
   * period's limit stays spent in full. */
  resetSpendPlan: (planId: string, newLimit?: number, startKey?: string) => Promise<void>;
  /** On a new month every plan starts over by itself (with the limit picked for it, if any). */
  rollOverSpendPlans: () => Promise<void>;
  /** Undoes the plan completely: its expenses (every period's limit and overspend) are deleted, so
   * all of that money goes back to the bank. Purchases logged inside it go with it. */
  deleteSpendPlan: (planId: string) => Promise<void>;
}

export const useFinanceStore = create<FinanceState>()((set, get) => ({
  expenses: [],
  categories: [],
  workDays: [],
  plannedExpenses: [],
  recurringExpenses: [],
  spendPlans: [],
  planSpends: [],
  isLoaded: false,

  load: async () => {
    const [expenses, categories, workDays, plannedExpenses, recurringExpenses, spendPlans, planSpends] = await Promise.all([
      financeRepo.listExpenses(),
      financeRepo.listCategories(),
      financeRepo.listWorkDays(),
      financeRepo.listPlannedExpenses(),
      financeRepo.listRecurringExpenses(),
      financeRepo.listSpendPlans(),
      financeRepo.listPlanSpends(),
    ]);
    set({ expenses, categories, workDays, plannedExpenses, recurringExpenses, spendPlans, planSpends, isLoaded: true });
  },

  addExpense: async (draft) => {
    const expense = await financeRepo.createExpense(draft);
    set((state) => ({ expenses: [expense, ...state.expenses] }));
    checkAlerts();
  },

  editExpense: async (expense) => {
    const before = get().expenses.find((e) => e.id === expense.id);
    if (before) keepBankInStep([before], -1);
    keepBankInStep([expense], +1);
    await financeRepo.updateExpense(expense);
    set((state) => ({ expenses: state.expenses.map((e) => (e.id === expense.id ? expense : e)) }));
    checkAlerts();
  },

  removeExpense: async (id) => {
    const expense = get().expenses.find((e) => e.id === id);
    if (expense) keepBankInStep([expense], -1);
    await financeRepo.deleteExpense(id);
    set((state) => ({ expenses: state.expenses.filter((e) => e.id !== id) }));
  },

  addCategory: async (name, color) => {
    const category = await financeRepo.createCategory(name, color);
    set((state) => ({ categories: [...state.categories, category] }));
  },

  editCategory: async (category) => {
    await financeRepo.updateCategory(category);
    set((state) => ({ categories: state.categories.map((c) => (c.id === category.id ? category : c)) }));
  },

  removeCategory: async (id) => {
    const expenseCount = await financeRepo.countExpensesInCategory(id);
    if (expenseCount > 0) return { ok: false, expenseCount };

    await financeRepo.deleteCategory(id);
    set((state) => ({ categories: state.categories.filter((c) => c.id !== id) }));
    return { ok: true, expenseCount: 0 };
  },

  setWorkDay: async (date, isWorked, hoursOverride = null, hourlyRateOverride = null) => {
    const workDay = await financeRepo.upsertWorkDay(date, isWorked, hoursOverride, hourlyRateOverride);
    set((state) => ({
      workDays: [...state.workDays.filter((w) => w.date !== date), workDay].sort((a, b) =>
        a.date.localeCompare(b.date)
      ),
    }));
  },

  toggleWorkedToday: async () => {
    const today = todayKey();
    const existing = get().workDays.find((w) => w.date === today);
    await get().setWorkDay(today, !existing?.isWorked);
  },

  clearWorkDay: async (date) => {
    await financeRepo.deleteWorkDay(date);
    set((state) => ({ workDays: state.workDays.filter((w) => w.date !== date) }));
  },

  addPlannedExpense: async (draft) => {
    const item = await financeRepo.createPlannedExpense(draft);
    set((state) => ({ plannedExpenses: [item, ...state.plannedExpenses] }));
  },

  removePlannedExpense: async (id) => {
    await financeRepo.deletePlannedExpense(id);
    set((state) => ({ plannedExpenses: state.plannedExpenses.filter((p) => p.id !== id) }));
  },

  addRecurringExpense: async (draft) => {
    const item = await financeRepo.createRecurringExpense(draft);
    set((state) => ({ recurringExpenses: [...state.recurringExpenses, item] }));
  },

  removeRecurringExpense: async (id) => {
    await financeRepo.deleteRecurringExpense(id);
    set((state) => ({ recurringExpenses: state.recurringExpenses.filter((r) => r.id !== id) }));
  },

  syncRecurringExpenses: async () => {
    const today = todayKey();
    const newExpenses: Expense[] = [];

    for (const recurring of get().recurringExpenses) {
      let dueDate = recurring.nextDueDate;
      let iterations = 0;

      while (dueDate <= today && iterations < 24) {
        const expense = await financeRepo.createExpense({
          amount: recurring.amount,
          categoryId: recurring.categoryId,
          date: dueDate,
          comment: recurring.comment,
        });
        newExpenses.push(expense);

        dueDate = nextOccurrenceDateKey(recurring.freq, recurring.interval, recurring.weekdays, dueDate);
        iterations += 1;
      }

      if (dueDate !== recurring.nextDueDate) {
        await financeRepo.updateRecurringExpenseNextDue(recurring.id, dueDate);
        set((state) => ({
          recurringExpenses: state.recurringExpenses.map((r) => (r.id === recurring.id ? { ...r, nextDueDate: dueDate } : r)),
        }));
      }
    }

    if (newExpenses.length > 0) {
      set((state) => ({ expenses: [...newExpenses, ...state.expenses] }));
      checkAlerts();
    }
  },

  createSpendPlan: async ({ name, categoryId, limit, date }) => {
    const planId = generateId();
    const reserve = await financeRepo.createExpense({ amount: limit, categoryId, date, comment: name, planId, planRole: 'reserve' });
    const plan: SpendPlan = {
      id: planId,
      name,
      categoryId,
      limit,
      period: 0,
      periodStart: todayKey(),
      reserveExpenseId: reserve.id,
      overspendExpenseId: null,
      createdAt: new Date().toISOString(),
    };
    await financeRepo.saveSpendPlan(plan);
    set((state) => ({ expenses: [reserve, ...state.expenses], spendPlans: [...state.spendPlans, plan] }));
  },

  rollOverSpendPlans: async () => {
    const monthStart = toDateKey(startOfMonth(new Date()));
    const { settings, updateSettings } = useSettingsStore.getState();
    const planNextLimits = settings.planNextLimits;
    let used = false;
    for (const plan of get().spendPlans) {
      if (plan.periodStart >= monthStart) continue;
      await get().resetSpendPlan(plan.id, planNextLimits[plan.id], monthStart);
      used = used || plan.id in planNextLimits;
    }
    if (used) updateSettings({ planNextLimits: {} });
  },

  addPlanSpend: async (planId, amount) => {
    const plan = get().spendPlans.find((p) => p.id === planId);
    if (!plan) return;
    const spend = await financeRepo.createPlanSpend(planId, plan.period, amount, todayKey());
    set((state) => ({ planSpends: [spend, ...state.planSpends] }));
    await syncOverspend(planId);
    checkAlerts();
  },

  removePlanSpend: async (spendId) => {
    const spend = get().planSpends.find((s) => s.id === spendId);
    if (!spend) return;
    await financeRepo.deletePlanSpend(spendId);
    set((state) => ({ planSpends: state.planSpends.filter((s) => s.id !== spendId) }));
    await syncOverspend(spend.planId);
  },

  updateSpendPlan: async (planId, patch) => {
    const plan = get().spendPlans.find((p) => p.id === planId);
    if (!plan) return;
    const updated: SpendPlan = { ...plan, name: patch.name ?? plan.name, limit: patch.limit ?? plan.limit };
    await financeRepo.saveSpendPlan(updated);
    set((state) => ({ spendPlans: state.spendPlans.map((p) => (p.id === planId ? updated : p)) }));
    // The reserve is the limit taken off the bank, so it follows the new limit and name.
    const reserve = get().expenses.find((e) => e.id === updated.reserveExpenseId);
    if (reserve) await get().editExpense({ ...reserve, amount: updated.limit, comment: updated.name });
    await syncOverspend(planId);
  },

  resetSpendPlan: async (planId, newLimit, startKey) => {
    const plan = get().spendPlans.find((p) => p.id === planId);
    if (!plan) return;
    const limit = newLimit ?? plan.limit;
    const start = startKey ?? todayKey();
    const reserve = await financeRepo.createExpense({
      amount: limit,
      categoryId: plan.categoryId,
      date: start,
      comment: plan.name,
      planId,
      planRole: 'reserve',
    });
    const updated: SpendPlan = {
      ...plan,
      limit,
      period: plan.period + 1,
      periodStart: start,
      reserveExpenseId: reserve.id,
      overspendExpenseId: null,
    };
    await financeRepo.saveSpendPlan(updated);
    set((state) => ({
      expenses: [reserve, ...state.expenses],
      spendPlans: state.spendPlans.map((p) => (p.id === planId ? updated : p)),
    }));
  },

  deleteSpendPlan: async (planId) => {
    const plan = get().spendPlans.find((p) => p.id === planId);
    if (!plan) return;
    const planExpenses = get().expenses.filter((e) => e.planId === planId);
    keepBankInStep(planExpenses, -1);
    for (const expense of planExpenses) {
      await financeRepo.deleteExpense(expense.id);
    }
    await financeRepo.deleteSpendPlan(planId);
    set((state) => ({
      expenses: state.expenses.filter((e) => e.planId !== planId),
      spendPlans: state.spendPlans.filter((p) => p.id !== planId),
      planSpends: state.planSpends.filter((s) => s.planId !== planId),
    }));
  },
}));

/**
 * Keeps the plan's red "over the limit" expense equal to what was spent past the limit in this
 * period: created the first time it goes over, updated after, removed when it's back under.
 */
async function syncOverspend(planId: string): Promise<void> {
  const store = useFinanceStore.getState();
  const plan = store.spendPlans.find((p) => p.id === planId);
  if (!plan) return;
  const over = overspendOf(plan, spentInPeriod(plan, store.planSpends));
  const existing = store.expenses.find((e) => e.id === plan.overspendExpenseId);

  if (over > 0 && existing) {
    if (existing.amount !== over) await store.editExpense({ ...existing, amount: over, date: todayKey() });
    return;
  }
  if (over > 0) {
    const expense = await financeRepo.createExpense({
      amount: over,
      categoryId: plan.categoryId,
      date: todayKey(),
      comment: plan.name,
      planId,
      planRole: 'overspend',
    });
    const updated = { ...plan, overspendExpenseId: expense.id };
    await financeRepo.saveSpendPlan(updated);
    useFinanceStore.setState((state) => ({
      expenses: [expense, ...state.expenses],
      spendPlans: state.spendPlans.map((p) => (p.id === planId ? updated : p)),
    }));
    return;
  }
  if (existing) await store.removeExpense(existing.id);
  if (plan.overspendExpenseId) {
    const updated = { ...plan, overspendExpenseId: null };
    await financeRepo.saveSpendPlan(updated);
    useFinanceStore.setState((state) => ({ spendPlans: state.spendPlans.map((p) => (p.id === planId ? updated : p)) }));
  }
}

/**
 * Bank = the amount set by hand − expenses logged after it was set. Expenses logged before that
 * moment aren't part of the sum, so deleting or changing one of them wouldn't move the bank at all.
 * Deleting an expense must always give its money back (and changing it, the difference) — so for
 * those older expenses the change goes into the hand-set amount instead.
 * `sign` −1: these expenses are going away; +1: they're coming in (the new version of an edited one).
 */
function keepBankInStep(expenses: Expense[], sign: 1 | -1): void {
  const { bankBalanceBase, bankBalanceSetAt } = useSettingsStore.getState().settings;
  if (!bankBalanceSetAt) return;
  const before = expenses.filter((e) => e.createdAt <= bankBalanceSetAt).reduce((sum, e) => sum + e.amount, 0);
  if (before === 0) return;
  // Removing −X from the bank = +X; adding = −X.
  useSettingsStore.getState().updateSettings({ bankBalanceBase: bankBalanceBase - sign * before });
}

/** Budget alerts look at what was actually bought (plan purchases, not whole plan limits). */
function checkAlerts(): void {
  const { expenses, spendPlans, planSpends, categories } = useFinanceStore.getState();
  checkBudgetAlerts(spendingExpenses(expenses, spendPlans, planSpends), useSettingsStore.getState().settings, categories);
}

/** Expenses as spending — see spendingExpenses: plan purchases instead of whole plan limits. */
export function useSpendingExpenses() {
  const expenses = useFinanceStore((s) => s.expenses);
  const plans = useFinanceStore((s) => s.spendPlans);
  const spends = useFinanceStore((s) => s.planSpends);
  return useMemo(() => spendingExpenses(expenses, plans, spends), [expenses, plans, spends]);
}
