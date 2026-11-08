import { startOfMonth } from 'date-fns';
import {
  Account,
  Adjustment,
  Category,
  Expense,
  Income,
  PlannedExpense,
  PlanSpend,
  RecurringExpense,
  SpendPlan,
  Transfer,
  Upcoming,
  WorkDay,
} from '@/types';
import { AppSettings } from '@/types/settings';
import { accountBalance, isMainExpense, MAIN_ACCOUNT_ID, transfersNet } from './accounts';
import { computeBankBalance } from './expenses';
import { payrollState } from './earnings';
import { unspentInPlans } from './plans';
import { balanceOf, round2 } from './ledger';
import { toDateKey } from './dateRanges';

/**
 * Finance v1 → v2, run once per device (settings.financeModel 1 → 2).
 *
 * v1 kept the main card in settings and counted every balance as "typed-in base − what came after";
 * v2 makes the main card an ordinary account and every balance a sum of records. The rule that
 * makes the switch safe: for each account
 *
 *     opening adjustment = balance the user saw in v1 − what the v2 sum gives without it
 *
 * so right after the update every balance is exactly what it was. Old expenses stay in history and
 * statistics; they're simply inside that opening figure.
 *
 * Also merged on the way:
 *  - spending plans → category budgets: the reserved limit stops being taken off the card (it
 *    never physically left it), purchases ticked off in a plan become ordinary expenses;
 *  - planned + recurring expenses → upcoming payments;
 *  - the savings card from settings → a 'savings' account;
 *  - confirmed salaries → income records.
 */

export interface MigrationInput {
  settings: AppSettings;
  accounts: Account[];
  expenses: Expense[];
  transfers: Transfer[];
  spendPlans: SpendPlan[];
  planSpends: PlanSpend[];
  plannedExpenses: PlannedExpense[];
  recurringExpenses: RecurringExpense[];
  categories: Category[];
  workDays: WorkDay[];
  now: Date;
  newId: () => string;
}

export interface MigrationOutput {
  accounts: Account[];
  /** Expenses to insert or update (re-pointed to the primary account, plan purchases). */
  expensesUpsert: Expense[];
  expensesDelete: string[];
  transfers: Transfer[];
  adjustments: Adjustment[];
  incomes: Income[];
  upcoming: Upcoming[];
  categories: Category[];
  settingsPatch: Partial<AppSettings>;
  /** Balance per account id before and after — the migration test checks they're equal. */
  balances: Record<string, { before: number; after: number }>;
}

const isMain = (id: string | null | undefined) => !id || id === MAIN_ACCOUNT_ID;

export function migrateFinance(input: MigrationInput): MigrationOutput {
  const { settings, now, newId } = input;
  const today = toDateKey(now);
  const nowIso = now.toISOString();

  // ---- What v1 showed ---------------------------------------------------------------------------
  const legacyPayroll = payrollState(input.workDays, settings, now, { legacyAnchor: true });
  const mainBefore = round2(
    computeBankBalance(input.expenses.filter(isMainExpense), settings.bankBalanceBase, settings.bankBalanceSetAt, today).bank +
      legacyPayroll.creditedSinceSet +
      transfersNet(MAIN_ACCOUNT_ID, input.transfers, settings.bankBalanceSetAt) +
      // The big figure on the v1 Bank card is what's in the account: plans' unspent part included.
      unspentInPlans(input.spendPlans, input.planSpends)
  );
  const before = new Map<string, number>();
  for (const a of input.accounts) {
    before.set(a.id, round2(accountBalance(a, input.expenses, input.transfers, settings, today).balance));
  }

  // ---- Accounts --------------------------------------------------------------------------------
  const primary: Account = {
    id: newId(),
    kind: 'card',
    name: settings.mainAccountName.trim(),
    currency: settings.currency,
    base: 0,
    setAt: null,
    target: null,
    sortOrder: -1,
    createdAt: nowIso,
    isPrimary: true,
    ratePercent: null,
    openedAt: null,
  };
  before.set(primary.id, mainBefore);
  const accounts: Account[] = [
    primary,
    ...input.accounts.map((a) => ({ ...a, isPrimary: false, ratePercent: a.ratePercent ?? null, openedAt: a.openedAt ?? null })),
  ];

  const hasSavings = settings.savingsCard === 'on' || settings.savingsBalance > 0;
  if (hasSavings) {
    const savings: Account = {
      id: newId(),
      kind: 'savings',
      name: '',
      currency: settings.currency,
      base: 0,
      setAt: null,
      target: null,
      sortOrder: accounts.length,
      createdAt: nowIso,
      isPrimary: false,
      ratePercent: settings.savingsRatePercent || null,
      openedAt: settings.savingsOpenedAt,
    };
    accounts.push(savings);
    before.set(savings.id, round2(settings.savingsBalance));
  }
  const repoint = (id: string | null | undefined) => (isMain(id) ? primary.id : (id as string));

  // ---- Expenses: re-point, drop plan reserves, purchases become expenses -----------------------
  const planRecordIds = new Set<string>();
  for (const e of input.expenses) if (e.planRole && e.planId) planRecordIds.add(e.id);
  const expensesDelete = [...planRecordIds];

  const expensesUpsert: Expense[] = input.expenses
    .filter((e) => !planRecordIds.has(e.id))
    .map((e) => ({ ...e, accountId: repoint(e.accountId), planId: null, planRole: null }));

  const planById = new Map(input.spendPlans.map((p) => [p.id, p]));
  for (const s of input.planSpends) {
    const plan = planById.get(s.planId);
    if (!plan) continue;
    expensesUpsert.push({
      id: newId(),
      amount: s.amount,
      categoryId: plan.categoryId,
      date: s.date,
      comment: plan.name,
      createdAt: s.createdAt,
      planId: null,
      planRole: null,
      taskId: null,
      accountId: primary.id,
      rate: null,
    });
  }

  // Plan limits become the category's monthly budget (an existing budget is kept as the user set it).
  const planLimits = new Map<string, number>();
  for (const p of input.spendPlans) planLimits.set(p.categoryId, (planLimits.get(p.categoryId) ?? 0) + p.limit);
  const categories = input.categories.map((c) =>
    !c.limitMonth && planLimits.has(c.id) ? { ...c, limitMonth: planLimits.get(c.id)! } : c
  );

  const transfers = input.transfers.map((t) => ({
    ...t,
    fromId: t.fromId === MAIN_ACCOUNT_ID ? primary.id : t.fromId,
    toId: t.toId === MAIN_ACCOUNT_ID ? primary.id : t.toId,
  }));

  // ---- Salary ----------------------------------------------------------------------------------
  const salaryConfirmations: AppSettings['salaryConfirmations'] = {};
  const incomes: Income[] = [];
  for (const [key, c] of Object.entries(settings.salaryConfirmations)) {
    const accountId = repoint(c.accountId);
    salaryConfirmations[key] = { ...c, accountId };
    incomes.push({
      id: newId(),
      accountId,
      amount: c.amount,
      date: toDateKey(new Date(c.confirmedAt)),
      periodKey: key,
      createdAt: c.confirmedAt,
    });
  }
  // v1 treated periods paid before the last Bank update as already in Bank without asking. v2 only
  // knows answered periods, so those are marked answered (their money is inside the opening figure).
  const legacyAwaiting = new Set(legacyPayroll.awaiting.map((p) => p.key));
  for (const p of payrollState(input.workDays, settings, now).awaiting) {
    if (!legacyAwaiting.has(p.key) && !salaryConfirmations[p.key]) {
      salaryConfirmations[p.key] = { amount: p.amount, confirmedAt: nowIso, accountId: primary.id };
    }
  }

  // ---- Planned + recurring → upcoming ----------------------------------------------------------
  const monthStart = toDateKey(startOfMonth(now));
  const upcoming: Upcoming[] = [
    ...input.plannedExpenses.map(
      (p): Upcoming => ({
        id: p.id,
        amount: p.amount,
        categoryId: p.categoryId,
        accountId: primary.id,
        comment: p.comment,
        mode: 'month',
        date: monthStart,
        freq: null,
        interval: 1,
        weekdays: null,
        createdAt: p.createdAt,
      })
    ),
    ...input.recurringExpenses.map(
      (r): Upcoming => ({
        id: r.id,
        amount: r.amount,
        categoryId: r.categoryId,
        accountId: primary.id,
        comment: r.comment,
        mode: 'repeat',
        date: r.nextDueDate,
        freq: r.freq,
        interval: r.interval,
        weekdays: r.weekdays,
        createdAt: r.createdAt,
      })
    ),
  ];

  // ---- Opening adjustments: v1 balance − v2 sum ------------------------------------------------
  const data = { expenses: expensesUpsert, incomes, adjustments: [] as Adjustment[], transfers };
  const adjustments: Adjustment[] = [];
  const balances: MigrationOutput['balances'] = {};
  for (const a of accounts) {
    const was = before.get(a.id) ?? 0;
    const sum = balanceOf(a.id, data, primary.id, today);
    adjustments.push({
      id: newId(),
      accountId: a.id,
      amount: round2(was - sum),
      date: today,
      kind: 'opening',
      note: null,
      createdAt: nowIso,
    });
    balances[a.id] = { before: was, after: 0 };
  }
  const withOpening = { ...data, adjustments };
  for (const a of accounts) balances[a.id].after = balanceOf(a.id, withOpening, primary.id, today);

  return {
    accounts,
    expensesUpsert,
    expensesDelete,
    transfers,
    adjustments,
    incomes,
    upcoming,
    categories,
    settingsPatch: {
      financeModel: 2,
      salaryAccountId: repoint(settings.salaryAccountId),
      salaryConfirmations,
      savingsCard: 'off',
    },
    balances,
  };
}
