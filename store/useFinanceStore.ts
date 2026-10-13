import { create } from 'zustand';
import * as financeRepo from '@/db/financeRepo';
import { todayKey } from '@/lib/dateRanges';
import { nextOccurrenceDateKey } from '@/lib/recurrence';
import { checkBudgetAlerts } from '@/notifications';
import { overspendOf, spentInPeriod } from '@/lib/plans';
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
  /** New period: whatever of the old limit wasn't spent goes back to the bank, the (new) limit
   * comes off again and the bar starts from 0 %. */
  resetSpendPlan: (planId: string, newLimit?: number) => Promise<void>;
  /** Ends the plan: the unspent part goes back to the bank, what was spent stays in the history. */
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
    checkBudgetAlerts(get().expenses, useSettingsStore.getState().settings, get().categories);
  },

  editExpense: async (expense) => {
    await financeRepo.updateExpense(expense);
    set((state) => ({ expenses: state.expenses.map((e) => (e.id === expense.id ? expense : e)) }));
    checkBudgetAlerts(get().expenses, useSettingsStore.getState().settings, get().categories);
  },

  removeExpense: async (id) => {
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
      checkBudgetAlerts(get().expenses, useSettingsStore.getState().settings, get().categories);
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

  addPlanSpend: async (planId, amount) => {
    const plan = get().spendPlans.find((p) => p.id === planId);
    if (!plan) return;
    const spend = await financeRepo.createPlanSpend(planId, plan.period, amount, todayKey());
    set((state) => ({ planSpends: [spend, ...state.planSpends] }));
    await syncOverspend(planId);
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

  resetSpendPlan: async (planId, newLimit) => {
    const plan = get().spendPlans.find((p) => p.id === planId);
    if (!plan) return;
    await settleReserve(plan);
    const limit = newLimit ?? plan.limit;
    const reserve = await financeRepo.createExpense({
      amount: limit,
      categoryId: plan.categoryId,
      date: todayKey(),
      comment: plan.name,
      planId,
      planRole: 'reserve',
    });
    const updated: SpendPlan = {
      ...plan,
      limit,
      period: plan.period + 1,
      periodStart: todayKey(),
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
    await settleReserve(plan);
    await financeRepo.deleteSpendPlan(planId);
    set((state) => ({
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
 * Closes the current period's reserve at what was actually spent (up to the limit), so the
 * unspent part of the limit goes back to the bank. Nothing spent → the reserve goes away.
 */
async function settleReserve(plan: SpendPlan): Promise<void> {
  const store = useFinanceStore.getState();
  const reserve = store.expenses.find((e) => e.id === plan.reserveExpenseId);
  if (!reserve) return;
  const used = Math.min(plan.limit, spentInPeriod(plan, store.planSpends));
  if (used <= 0) await store.removeExpense(reserve.id);
  else if (used !== reserve.amount) await store.editExpense({ ...reserve, amount: used });
}
