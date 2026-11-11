import { create } from 'zustand';
import { useMemo } from 'react';
import * as financeRepo from '@/db/financeRepo';
import { todayKey } from '@/lib/dateRanges';
import { nextOccurrenceDateKey } from '@/lib/recurrence';
import { checkBudgetAlerts } from '@/notifications';
import { generateId } from '@/lib/id';
import { useSettingsStore } from './useSettingsStore';
import { inAppCurrency, primaryId, rateForAccount, rateFromTransfer } from '@/lib/accounts';
import { absorbInCheck, balanceOf, correctionFor, expenseAccountId, lastCheck, round2 } from '@/lib/ledger';
import { migrateFinance } from '@/lib/financeMigration';
import { checkDay, snoozeUntilTomorrow } from '@/lib/pending';
import { isPaidOff, monthlyPayment } from '@/lib/loans';
import {
  Account,
  AccountKind,
  Adjustment,
  Category,
  Expense,
  ExpenseDraft,
  Income,
  Loan,
  Transfer,
  Upcoming,
  UpcomingDraft,
  WorkDay,
} from '@/types';

/**
 * Finance v2 (docs/finance-v2.md): every balance is the sum of its records — expenses, incomes,
 * transfers and adjustments (lib/ledger.ts). Typing in a real balance adds a correction; nothing is
 * reset or recomputed backwards, so nothing can be counted twice.
 *
 * Records dated on or before an account's last balance check may already be inside the balance
 * typed in then. Screens ask the user (lib/ledger checkCovering) and pass the answer as
 * `alreadyCounted`: true → the check's adjustment absorbs the change and the balance stays put.
 */
interface FinanceState {
  expenses: Expense[];
  categories: Category[];
  workDays: WorkDay[];
  /** Every account; exactly one has isPrimary (the main card). */
  accounts: Account[];
  transfers: Transfer[];
  loans: Loan[];
  adjustments: Adjustment[];
  incomes: Income[];
  upcoming: Upcoming[];
  isLoaded: boolean;

  load: () => Promise<void>;

  addExpense: (draft: ExpenseDraft, opts?: { alreadyCounted?: boolean }) => Promise<void>;
  editExpense: (expense: Expense, opts?: { alreadyCounted?: boolean }) => Promise<void>;
  /** `alreadyCounted`: it wasn't really spent / the typed-in balance never had it — keep the balance. */
  removeExpense: (id: string, opts?: { alreadyCounted?: boolean }) => Promise<void>;

  addCategory: (name: string, color: string) => Promise<void>;
  editCategory: (category: Category) => Promise<void>;
  removeCategory: (id: string) => Promise<{ ok: boolean; expenseCount: number }>;
  /** Category budget for a month (null = none). */
  setCategoryBudget: (categoryId: string, limit: number | null) => Promise<void>;

  setWorkDay: (date: string, isWorked: boolean, hoursOverride?: number | null, hourlyRateOverride?: number | null) => Promise<void>;
  toggleWorkedToday: () => Promise<void>;
  clearWorkDay: (date: string) => Promise<void>;

  addUpcoming: (draft: UpcomingDraft) => Promise<void>;
  updateUpcoming: (item: Upcoming) => Promise<void>;
  removeUpcoming: (id: string) => Promise<void>;
  /** Its day came: `amount` null = it didn't happen; otherwise it becomes an expense. A repeating
   * one moves on to its next date either way. */
  answerUpcoming: (id: string, amount: number | null) => Promise<void>;

  /** "The salary came": an income on `accountId`, and the period stops waiting. */
  confirmSalary: (periodKey: string, amount: number, accountId: string) => Promise<void>;
  /** A loan payment's day came: `amount` null = not yet (asks again tomorrow). */
  answerLoan: (loanId: string, amount: number | null, accountId?: string) => Promise<void>;
  /** Weekly check: `real` null = "yes, it's right"; a number = the real balance (a correction). */
  answerCheck: (accountId: string, real: number | null) => Promise<void>;
  /** "Not yet" on any awaiting item: hidden until tomorrow. */
  snoozePending: (key: string) => void;

  addAccount: (draft: {
    kind: AccountKind;
    name: string;
    currency: string;
    balance: number;
    target?: number | null;
    ratePercent?: number | null;
    openedAt?: string | null;
  }) => Promise<void>;
  /** Rename / currency / target / savings rate. */
  updateAccount: (account: Account) => Promise<void>;
  /** The real balance typed in by hand: the difference is saved as a correction. */
  setAccountBalance: (id: string, real: number, note?: string | null) => Promise<void>;
  makePrimary: (id: string) => Promise<void>;
  /** The primary account can't be removed. Its expenses and transfers stay in the history. */
  removeAccount: (id: string) => Promise<void>;
  addTransfer: (draft: { fromId: string; toId: string; amount: number; amountTo: number; date: string }) => Promise<void>;
  removeTransfer: (id: string) => Promise<void>;

  addLoan: (draft: Omit<Loan, 'id' | 'createdAt'>) => Promise<void>;
  updateLoan: (loan: Loan) => Promise<void>;
  removeLoan: (id: string) => Promise<void>;
  /** "Paid": the monthly payment (or `amount`) is logged as an expense of `accountId`. */
  payLoan: (id: string, accountId: string, amount?: number) => Promise<void>;
}

const nowIso = () => new Date().toISOString();

export const useFinanceStore = create<FinanceState>()((set, get) => ({
  expenses: [],
  categories: [],
  workDays: [],
  accounts: [],
  transfers: [],
  loans: [],
  adjustments: [],
  incomes: [],
  upcoming: [],
  isLoaded: false,

  load: async () => {
    await settingsReady();
    if (useSettingsStore.getState().settings.financeModel !== 2) await runFinanceMigration();
    const [expenses, categories, workDays, accounts, transfers, loans, adjustments, incomes, upcoming] = await Promise.all([
      financeRepo.listExpenses(),
      financeRepo.listCategories(),
      financeRepo.listWorkDays(),
      financeRepo.listAccounts(),
      financeRepo.listTransfers(),
      financeRepo.listLoans(),
      financeRepo.listAdjustments(),
      financeRepo.listIncomes(),
      financeRepo.listUpcoming(),
    ]);
    set({ expenses, categories, workDays, accounts, transfers, loans, adjustments, incomes, upcoming, isLoaded: true });
  },

  addExpense: async (draft, opts) => {
    const { accounts } = get();
    const { settings } = useSettingsStore.getState();
    const accountId = draft.accountId ?? primaryId(accounts);
    const expense = await financeRepo.createExpense({
      ...draft,
      accountId,
      rate: draft.rate ?? rateForAccount(accountId, accounts, settings.currency, settings.currencyRates),
    });
    set((state) => ({ expenses: [expense, ...state.expenses] }));
    if (opts?.alreadyCounted) await absorb(accountId, expense.date, -expense.amount);
    checkAlerts();
  },

  editExpense: async (expense, opts) => {
    const before = get().expenses.find((e) => e.id === expense.id);
    await financeRepo.updateExpense(expense);
    set((state) => ({ expenses: state.expenses.map((e) => (e.id === expense.id ? expense : e)) }));
    if (opts?.alreadyCounted && before) {
      const pid = primaryId(get().accounts);
      // The old version leaves (+amount), the new one comes in (−amount); the checks keep both out.
      await absorb(expenseAccountId(before, pid), before.date, +before.amount);
      await absorb(expenseAccountId(expense, pid), expense.date, -expense.amount);
    }
    checkAlerts();
  },

  removeExpense: async (id, opts) => {
    const expense = get().expenses.find((e) => e.id === id);
    await financeRepo.deleteExpense(id);
    set((state) => ({ expenses: state.expenses.filter((e) => e.id !== id) }));
    if (expense && opts?.alreadyCounted) {
      await absorb(expenseAccountId(expense, primaryId(get().accounts)), expense.date, +expense.amount);
    }
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
    const inUpcoming = get().upcoming.filter((u) => u.categoryId === id).length;
    if (expenseCount + inUpcoming > 0) return { ok: false, expenseCount: expenseCount + inUpcoming };
    await financeRepo.deleteCategory(id);
    set((state) => ({ categories: state.categories.filter((c) => c.id !== id) }));
    return { ok: true, expenseCount: 0 };
  },

  setCategoryBudget: async (categoryId, limit) => {
    const category = get().categories.find((c) => c.id === categoryId);
    if (!category) return;
    await get().editCategory({ ...category, limitMonth: limit && limit > 0 ? limit : null });
  },

  setWorkDay: async (date, isWorked, hoursOverride = null, hourlyRateOverride = null) => {
    const workDay = await financeRepo.upsertWorkDay(date, isWorked, hoursOverride, hourlyRateOverride);
    set((state) => ({
      workDays: [...state.workDays.filter((w) => w.date !== date), workDay].sort((a, b) => a.date.localeCompare(b.date)),
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

  addUpcoming: async (draft) => {
    const item: Upcoming = { ...draft, id: generateId(), createdAt: nowIso() };
    await financeRepo.saveUpcoming(item);
    set((state) => ({ upcoming: [...state.upcoming, item] }));
  },

  updateUpcoming: async (item) => {
    await financeRepo.saveUpcoming(item);
    set((state) => ({ upcoming: state.upcoming.map((u) => (u.id === item.id ? item : u)) }));
  },

  removeUpcoming: async (id) => {
    await financeRepo.deleteUpcoming(id);
    set((state) => ({ upcoming: state.upcoming.filter((u) => u.id !== id) }));
  },

  answerUpcoming: async (id, amount) => {
    const item = get().upcoming.find((u) => u.id === id);
    if (!item) return;
    if (amount !== null && amount > 0) {
      // A "this month" payment has no day of its own: it's logged today.
      const date = item.mode === 'month' ? todayKey() : item.date;
      await get().addExpense({ amount, categoryId: item.categoryId, date, comment: item.comment, accountId: item.accountId });
    }
    if (item.mode === 'repeat' && item.freq) {
      await get().updateUpcoming({ ...item, date: nextOccurrenceDateKey(item.freq, item.interval, item.weekdays, item.date) });
    } else {
      await get().removeUpcoming(id);
    }
  },

  confirmSalary: async (periodKey, amount, accountId) => {
    const { settings, updateSettings } = useSettingsStore.getState();
    const at = nowIso();
    const income: Income = { id: generateId(), accountId, amount, date: todayKey(), periodKey, createdAt: at };
    await financeRepo.saveIncome(income);
    set((state) => ({ incomes: [income, ...state.incomes] }));
    updateSettings({
      salaryConfirmations: { ...settings.salaryConfirmations, [periodKey]: { amount, confirmedAt: at, accountId } },
      salaryPromptSnoozedUntil: null,
    });
  },

  answerLoan: async (loanId, amount, accountId) => {
    const loan = get().loans.find((l) => l.id === loanId);
    if (!loan) return;
    if (amount === null) {
      get().snoozePending(`loan-${loan.id}-${loan.paidCount}`);
      return;
    }
    await get().payLoan(loanId, accountId ?? primaryId(get().accounts), amount);
  },

  answerCheck: async (accountId, real) => {
    if (real !== null) await get().setAccountBalance(accountId, real);
    const { settings, updateSettings } = useSettingsStore.getState();
    const day = checkDay(settings.reconcileWeekday ?? 0);
    updateSettings({ reconciledWeeks: { ...settings.reconciledWeeks, [accountId]: day } });
  },

  snoozePending: (key) => {
    const { settings, updateSettings } = useSettingsStore.getState();
    // Old snoozes are dropped on the way so the map doesn't grow forever.
    const now = nowIso();
    const kept = Object.fromEntries(Object.entries(settings.pendingSnoozed).filter(([, until]) => until > now));
    updateSettings({ pendingSnoozed: { ...kept, [key]: snoozeUntilTomorrow() } });
  },

  addAccount: async ({ kind, name, currency, balance, target = null, ratePercent = null, openedAt = null }) => {
    const at = nowIso();
    const account: Account = {
      id: generateId(),
      kind,
      name: name.trim(),
      currency: currency.trim(),
      base: 0,
      setAt: null,
      target,
      sortOrder: get().accounts.length,
      createdAt: at,
      isPrimary: false,
      ratePercent,
      openedAt,
    };
    await financeRepo.saveAccount(account);
    const opening: Adjustment = { id: generateId(), accountId: account.id, amount: round2(balance), date: todayKey(), kind: 'opening', note: null, createdAt: at };
    await financeRepo.saveAdjustment(opening);
    set((state) => ({ accounts: [...state.accounts, account], adjustments: [opening, ...state.adjustments] }));
  },

  updateAccount: async (account) => {
    await financeRepo.saveAccount(account);
    set((state) => ({ accounts: state.accounts.map((a) => (a.id === account.id ? account : a)) }));
  },

  setAccountBalance: async (id, real, note = null) => {
    const state = get();
    const current = balanceOf(id, state, primaryId(state.accounts));
    const amount = correctionFor(real, current);
    const correction: Adjustment = { id: generateId(), accountId: id, amount, date: todayKey(), kind: 'correction', note, createdAt: nowIso() };
    // Even a zero correction is kept: it marks "checked on this day" for the questions above.
    await financeRepo.saveAdjustment(correction);
    set((s) => ({ adjustments: [correction, ...s.adjustments] }));
  },

  makePrimary: async (id) => {
    const updated = get().accounts.map((a) => ({ ...a, isPrimary: a.id === id }));
    for (const a of updated) await financeRepo.saveAccount(a);
    set({ accounts: updated });
  },

  removeAccount: async (id) => {
    const account = get().accounts.find((a) => a.id === id);
    if (!account || account.isPrimary) return;
    await financeRepo.deleteAccount(id);
    await financeRepo.deleteAdjustmentsOf(id);
    set((state) => ({
      accounts: state.accounts.filter((a) => a.id !== id),
      adjustments: state.adjustments.filter((a) => a.accountId !== id),
    }));
    const { settings, updateSettings } = useSettingsStore.getState();
    if (settings.salaryAccountId === id) updateSettings({ salaryAccountId: primaryId(get().accounts) });
  },

  addTransfer: async (draft) => {
    const transfer = await financeRepo.createTransfer(draft);
    set((state) => ({ transfers: [transfer, ...state.transfers] }));
    // A transfer between złoty and another currency tells the current rate.
    const { accounts } = get();
    const { settings, updateSettings } = useSettingsStore.getState();
    const cur = (accountId: string) => accounts.find((a) => a.id === accountId)?.currency ?? settings.currency;
    const rate = rateFromTransfer(cur(draft.fromId), cur(draft.toId), draft.amount, draft.amountTo, settings.currency);
    if (rate) updateSettings({ currencyRates: { ...settings.currencyRates, [rate[0]]: rate[1] } });
  },

  removeTransfer: async (id) => {
    await financeRepo.deleteTransfer(id);
    set((state) => ({ transfers: state.transfers.filter((x) => x.id !== id) }));
  },

  addLoan: async (draft) => {
    const loan: Loan = { ...draft, id: generateId(), createdAt: nowIso() };
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

  payLoan: async (id, accountId, amount) => {
    const loan = get().loans.find((l) => l.id === id);
    if (!loan || isPaidOff(loan)) return;
    const { categories } = get();
    const categoryId = (categories.find((c) => c.id === 'cat-loans') ?? categories.find((c) => c.id === 'cat-other') ?? categories[0])?.id;
    if (categoryId) {
      await get().addExpense({
        amount: round2(amount ?? monthlyPayment(loan)),
        categoryId,
        date: todayKey(),
        comment: loan.name,
        accountId,
      });
    }
    await get().updateLoan({ ...loan, paidCount: loan.paidCount + 1 });
  },
}));

/** The "was it already in the balance you typed?" → yes path: the account's latest check absorbs
 * the change, so the balance stays where it was. */
async function absorb(accountId: string, _date: string, balanceDelta: number): Promise<void> {
  const check = lastCheck(accountId, useFinanceStore.getState().adjustments);
  if (!check) return;
  const updated = absorbInCheck(check, balanceDelta);
  await financeRepo.saveAdjustment(updated);
  useFinanceStore.setState((state) => ({ adjustments: state.adjustments.map((a) => (a.id === updated.id ? updated : a)) }));
}

/** Settings live in their own persisted store; the migration needs them loaded first. */
function settingsReady(): Promise<void> {
  const persist = (useSettingsStore as unknown as { persist?: { hasHydrated: () => boolean; onFinishHydration: (cb: () => void) => () => void } }).persist;
  if (!persist || persist.hasHydrated()) return Promise.resolve();
  return new Promise((resolve) => {
    const unsubscribe = persist.onFinishHydration(() => {
      unsubscribe();
      resolve();
    });
  });
}

/** Finance v1 → v2, once (see lib/financeMigration.ts). */
async function runFinanceMigration(): Promise<void> {
  const { settings, updateSettings } = useSettingsStore.getState();
  const [accounts, expenses, transfers, spendPlans, planSpends, plannedExpenses, recurringExpenses, categories, workDays] =
    await Promise.all([
      financeRepo.listAccounts(),
      financeRepo.listExpenses(),
      financeRepo.listTransfers(),
      financeRepo.listSpendPlans(),
      financeRepo.listPlanSpends(),
      financeRepo.listPlannedExpenses(),
      financeRepo.listRecurringExpenses(),
      financeRepo.listCategories(),
      financeRepo.listWorkDays(),
    ]);
  // Already has a primary account (e.g. a v2 backup restored with an old settings blob): nothing to move.
  if (accounts.some((a) => a.isPrimary)) {
    updateSettings({ financeModel: 2 });
    return;
  }
  const out = migrateFinance({
    settings,
    accounts,
    expenses,
    transfers,
    spendPlans,
    planSpends,
    plannedExpenses,
    recurringExpenses,
    categories,
    workDays,
    now: new Date(),
    newId: generateId,
  });
  await financeRepo.applyFinanceMigration(out);
  updateSettings(out.settingsPatch);
}

/** Budget alerts look at spending in the app currency. */
function checkAlerts(): void {
  const { expenses, categories, accounts } = useFinanceStore.getState();
  const settings = useSettingsStore.getState().settings;
  checkBudgetAlerts(inAppCurrency(expenses, accounts, settings.currency, settings.currencyRates), settings, categories);
}

/** Expenses in the app currency (others converted with their rate, see inAppCurrency) — for totals,
 * statistics and budgets. */
export function useSpendingExpenses() {
  const expenses = useFinanceStore((s) => s.expenses);
  const accounts = useFinanceStore((s) => s.accounts);
  const currency = useSettingsStore((s) => s.settings.currency);
  const rates = useSettingsStore((s) => s.settings.currencyRates);
  return useMemo(() => inAppCurrency(expenses, accounts, currency, rates), [expenses, accounts, currency, rates]);
}

/** The primary account (the main card) — undefined only until the first load finishes. */
export function usePrimaryAccount(): Account | undefined {
  return useFinanceStore((s) => s.accounts.find((a) => a.isPrimary));
}
