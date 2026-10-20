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
import { accountIdOf, inAppCurrency, MAIN_ACCOUNT_ID } from '@/lib/accounts';
import { chargedAt, isDue } from '@/lib/expenses';
import { isPaidOff, monthlyPayment } from '@/lib/loans';
import {
  Account,
  AccountKind,
  Category,
  Expense,
  Loan,
  ExpenseDraft,
  PlannedExpenseDraft,
  PlannedExpense,
  PlanSpend,
  RecurringExpense,
  SpendPlan,
  RecurringExpenseDraft,
  Transfer,
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
  /** Cards besides the main one, and cash wallets (see lib/accounts). */
  accounts: Account[];
  transfers: Transfer[];
  loans: Loan[];
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

  addAccount: (draft: { kind: AccountKind; name: string; currency: string; balance: number; target?: number | null }) => Promise<void>;
  /** Rename / change the currency. */
  updateAccount: (account: Account) => Promise<void>;
  /** The balance typed in by hand: from now on expenses and transfers move it from there. */
  setAccountBalance: (id: string, balance: number) => Promise<void>;
  /** The other accounts keep their balances; this one's expenses stay in the history. */
  removeAccount: (id: string) => Promise<void>;
  addTransfer: (draft: { fromId: string; toId: string; amount: number; amountTo: number; date: string }) => Promise<void>;
  /** Undoes the transfer: the money goes back where it came from. */
  removeTransfer: (id: string) => Promise<void>;

  /** `paidCount`: payments already made before it was added (no expenses are logged for them). */
  addLoan: (draft: Omit<Loan, 'id' | 'createdAt'>) => Promise<void>;
  updateLoan: (loan: Loan) => Promise<void>;
  removeLoan: (id: string) => Promise<void>;
  /** "Paid": the monthly payment is logged as an expense of `accountId` and counted as made. */
  payLoan: (id: string, accountId: string) => Promise<void>;
}

export const useFinanceStore = create<FinanceState>()((set, get) => ({
  expenses: [],
  categories: [],
  workDays: [],
  plannedExpenses: [],
  recurringExpenses: [],
  spendPlans: [],
  planSpends: [],
  accounts: [],
  transfers: [],
  loans: [],
  isLoaded: false,

  load: async () => {
    const [expenses, categories, workDays, plannedExpenses, recurringExpenses, spendPlans, planSpends, accounts, transfers, loans] = await Promise.all([
      financeRepo.listExpenses(),
      financeRepo.listCategories(),
      financeRepo.listWorkDays(),
      financeRepo.listPlannedExpenses(),
      financeRepo.listRecurringExpenses(),
      financeRepo.listSpendPlans(),
      financeRepo.listPlanSpends(),
      financeRepo.listAccounts(),
      financeRepo.listTransfers(),
      financeRepo.listLoans(),
    ]);
    set({ expenses, categories, workDays, plannedExpenses, recurringExpenses, spendPlans, planSpends, accounts, transfers, loans, isLoaded: true });
  },

  addExpense: async (draft) => {
    const expense = await financeRepo.createExpense(draft);
    set((state) => ({ expenses: [expense, ...state.expenses] }));
    checkAlerts();
  },

  editExpense: async (expense) => {
    const before = get().expenses.find((e) => e.id === expense.id);
    if (before) await keepBalancesInStep([before], -1);
    await keepBalancesInStep([expense], +1);
    await financeRepo.updateExpense(expense);
    set((state) => ({ expenses: state.expenses.map((e) => (e.id === expense.id ? expense : e)) }));
    checkAlerts();
  },

  removeExpense: async (id) => {
    const expense = get().expenses.find((e) => e.id === id);
    if (expense) await keepBalancesInStep([expense], -1);
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
    await keepBalancesInStep(planExpenses, -1);
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

  addAccount: async ({ kind, name, currency, balance, target = null }) => {
    const now = new Date().toISOString();
    const account: Account = {
      id: generateId(),
      kind,
      name: name.trim(),
      currency: currency.trim(),
      base: balance,
      setAt: now,
      target,
      sortOrder: get().accounts.length,
      createdAt: now,
    };
    await financeRepo.saveAccount(account);
    set((state) => ({ accounts: [...state.accounts, account] }));
  },

  updateAccount: async (account) => {
    await financeRepo.saveAccount(account);
    set((state) => ({ accounts: state.accounts.map((a) => (a.id === account.id ? account : a)) }));
  },

  setAccountBalance: async (id, balance) => {
    const account = get().accounts.find((a) => a.id === id);
    if (!account) return;
    await get().updateAccount({ ...account, base: balance, setAt: new Date().toISOString() });
  },

  removeAccount: async (id) => {
    const gone = get().transfers.filter((t) => t.fromId === id || t.toId === id);
    // The other side of each transfer keeps the money it has now.
    for (const t of gone) {
      const otherId = t.fromId === id ? t.toId : t.fromId;
      const effect = t.toId === otherId ? t.amountTo : -t.amount;
      if (isCounted(otherId, t.createdAt)) await adjustBase(otherId, effect);
    }
    await financeRepo.deleteAccount(id);
    set((state) => ({
      accounts: state.accounts.filter((a) => a.id !== id),
      transfers: state.transfers.filter((t) => t.fromId !== id && t.toId !== id),
    }));
    const { settings, updateSettings } = useSettingsStore.getState();
    if (settings.salaryAccountId === id) updateSettings({ salaryAccountId: MAIN_ACCOUNT_ID });
  },

  addTransfer: async (draft) => {
    const transfer = await financeRepo.createTransfer(draft);
    set((state) => ({ transfers: [transfer, ...state.transfers] }));
  },

  removeTransfer: async (id) => {
    const t = get().transfers.find((x) => x.id === id);
    if (!t) return;
    // Like an expense: if a side's balance was typed in after the transfer, it isn't part of that
    // balance any more — undoing it has to go through the typed-in amount.
    if (!isCounted(t.fromId, t.createdAt)) await adjustBase(t.fromId, t.amount);
    if (!isCounted(t.toId, t.createdAt)) await adjustBase(t.toId, -t.amountTo);
    await financeRepo.deleteTransfer(id);
    set((state) => ({ transfers: state.transfers.filter((x) => x.id !== id) }));
  },

  addLoan: async (draft) => {
    const loan: Loan = { ...draft, id: generateId(), createdAt: new Date().toISOString() };
    await financeRepo.saveLoan(loan);
    set((state) => ({ loans: [...state.loans, loan] }));
  },

  updateLoan: async (loan) => {
    await financeRepo.saveLoan(loan);
    set((state) => ({ loans: state.loans.map((l) => (l.id === loan.id ? loan : l)) }));
  },

  removeLoan: async (id) => {
    await financeRepo.deleteLoan(id);
    set((state) => ({ loans: state.loans.filter((l) => l.id !== id) }));
  },

  payLoan: async (id, accountId) => {
    const loan = get().loans.find((l) => l.id === id);
    if (!loan || isPaidOff(loan)) return;
    const { categories } = get();
    const categoryId = (categories.find((c) => c.id === 'cat-other') ?? categories[0])?.id;
    if (categoryId) {
      await get().addExpense({
        amount: Math.round(monthlyPayment(loan) * 100) / 100,
        categoryId,
        date: todayKey(),
        comment: loan.name,
        accountId: accountId === MAIN_ACCOUNT_ID ? null : accountId,
      });
    }
    await get().updateLoan({ ...loan, paidCount: loan.paidCount + 1 });
  },
}));

/** When the account's balance was last typed in (null = never). */
function setAtOf(accountId: string): string | null {
  if (accountId === MAIN_ACCOUNT_ID) return useSettingsStore.getState().settings.bankBalanceSetAt;
  return useFinanceStore.getState().accounts.find((a) => a.id === accountId)?.setAt ?? null;
}

/** Is something created at `createdAt` part of the account's balance (logged after it was set)? */
function isCounted(accountId: string, createdAt: string): boolean {
  const setAt = setAtOf(accountId);
  return !setAt || createdAt > setAt;
}

/** Moves the typed-in amount of an account by `delta`. */
async function adjustBase(accountId: string, delta: number): Promise<void> {
  if (delta === 0) return;
  if (accountId === MAIN_ACCOUNT_ID) {
    const { settings, updateSettings } = useSettingsStore.getState();
    updateSettings({ bankBalanceBase: settings.bankBalanceBase + delta });
    return;
  }
  const account = useFinanceStore.getState().accounts.find((a) => a.id === accountId);
  if (!account) return;
  const updated = { ...account, base: account.base + delta };
  await financeRepo.saveAccount(updated);
  useFinanceStore.setState((state) => ({ accounts: state.accounts.map((a) => (a.id === accountId ? updated : a)) }));
}

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
 * A balance = the amount set by hand − expenses logged after it was set. Expenses logged before that
 * moment aren't part of the sum, so deleting or changing one of them wouldn't move the balance at all.
 * Deleting an expense must always give its money back (and changing it, the difference) — so for
 * those older expenses the change goes into the hand-set amount of the card or cash they were paid
 * from instead.
 * `sign` −1: these expenses are going away; +1: they're coming in (the new version of an edited one).
 */
async function keepBalancesInStep(expenses: Expense[], sign: 1 | -1): Promise<void> {
  const byAccount = new Map<string, number>();
  for (const e of expenses) {
    const id = accountIdOf(e);
    // Dated in the future: it hasn't left the card yet, and won't once it's gone — nothing to fix.
    // Charged after the balance was typed in: the balance follows it by itself.
    if (!isDue(e) || isCounted(id, chargedAt(e))) continue;
    byAccount.set(id, (byAccount.get(id) ?? 0) + e.amount);
  }
  // Removing −X from the balance = +X; adding = −X.
  for (const [id, amount] of byAccount) await adjustBase(id, -sign * amount);
}

/** Budget alerts look at what was actually bought (plan purchases, not whole plan limits). */
function checkAlerts(): void {
  const { expenses, spendPlans, planSpends, categories, accounts } = useFinanceStore.getState();
  const settings = useSettingsStore.getState().settings;
  checkBudgetAlerts(inAppCurrency(spendingExpenses(expenses, spendPlans, planSpends), accounts, settings.currency), settings, categories);
}

/** Expenses as spending — see spendingExpenses: plan purchases instead of whole plan limits. Only
 * the ones in the app currency (see inAppCurrency). */
export function useSpendingExpenses() {
  const expenses = useFinanceStore((s) => s.expenses);
  const plans = useFinanceStore((s) => s.spendPlans);
  const spends = useFinanceStore((s) => s.planSpends);
  const accounts = useFinanceStore((s) => s.accounts);
  const currency = useSettingsStore((s) => s.settings.currency);
  return useMemo(
    () => inAppCurrency(spendingExpenses(expenses, plans, spends), accounts, currency),
    [expenses, plans, spends, accounts, currency]
  );
}
