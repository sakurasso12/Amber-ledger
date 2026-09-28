import { create } from 'zustand';
import * as financeRepo from '@/db/financeRepo';
import { todayKey } from '@/lib/dateRanges';
import { nextOccurrenceDateKey } from '@/lib/recurrence';
import { checkBudgetAlerts } from '@/notifications';
import { useSettingsStore } from './useSettingsStore';
import {
  Category,
  Expense,
  ExpenseDraft,
  PlannedExpenseDraft,
  PlannedExpense,
  RecurringExpense,
  RecurringExpenseDraft,
  WorkDay,
} from '@/types';

interface FinanceState {
  expenses: Expense[];
  categories: Category[];
  workDays: WorkDay[];
  plannedExpenses: PlannedExpense[];
  recurringExpenses: RecurringExpense[];
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
}

export const useFinanceStore = create<FinanceState>()((set, get) => ({
  expenses: [],
  categories: [],
  workDays: [],
  plannedExpenses: [],
  recurringExpenses: [],
  isLoaded: false,

  load: async () => {
    const [expenses, categories, workDays, plannedExpenses, recurringExpenses] = await Promise.all([
      financeRepo.listExpenses(),
      financeRepo.listCategories(),
      financeRepo.listWorkDays(),
      financeRepo.listPlannedExpenses(),
      financeRepo.listRecurringExpenses(),
    ]);
    set({ expenses, categories, workDays, plannedExpenses, recurringExpenses, isLoaded: true });
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
}));
