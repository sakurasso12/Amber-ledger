import { Account, Category, RecurringExpense, PlannedExpense, Transfer, WorkDay } from '@/types';
import { DEFAULT_SETTINGS, AppSettings } from '@/types/settings';
import { migrateFinance, MigrationInput } from '@/lib/financeMigration';
import { balanceOf } from '@/lib/ledger';
import { payrollState } from '@/lib/earnings';
import { expense, plan, spend } from './factories';

const NOW = new Date('2026-10-20T12:00:00');

function v1Account(fields: Partial<Account>): Account {
  return {
    id: 'revolut',
    kind: 'card',
    name: 'Revolut',
    currency: 'zł',
    base: 500,
    setAt: '2026-10-01T08:00:00.000Z',
    target: null,
    sortOrder: 0,
    createdAt: '2026-09-01T08:00:00.000Z',
    isPrimary: false,
    ratePercent: null,
    openedAt: null,
    ...fields,
  };
}

const food: Category = { id: 'cat-food', name: 'Food', color: '#f00', isDefault: true, sortOrder: 0, limitMonth: null };
const other: Category = { id: 'cat-other', name: 'Other', color: '#0f0', isDefault: true, sortOrder: 1, limitMonth: 200 };

let n = 0;
const newId = () => `new-${++n}`;

function input(fields: Partial<MigrationInput> = {}, settings: Partial<AppSettings> = {}): MigrationInput {
  return {
    settings: {
      ...DEFAULT_SETTINGS,
      bankBalanceBase: 2000,
      bankBalanceSetAt: '2026-10-05T10:00:00.000Z',
      mainAccountName: 'PKO',
      hourlyRate: 30,
      hoursPerShift: 10,
      paydayDay: 10,
      ...settings,
    },
    accounts: [],
    expenses: [],
    transfers: [],
    spendPlans: [],
    planSpends: [],
    plannedExpenses: [],
    recurringExpenses: [],
    categories: [food, other],
    workDays: [],
    now: NOW,
    newId,
    ...fields,
  };
}

const workDay = (date: string): WorkDay => ({ id: date, date, isWorked: true, hoursOverride: null, hourlyRateOverride: null });

/** A busy v1 phone: everything that touched the old balance math at once. */
function busyPhone(): MigrationInput {
  const revolut = v1Account({});
  const eurCash = v1Account({ id: 'eur', kind: 'cash', name: '', currency: '€', base: 100, setAt: '2026-10-02T08:00:00.000Z' });
  const goal = v1Account({ id: 'goal', kind: 'goal', name: 'Trip', base: 0, setAt: null, target: 3000 });
  const transfers: Transfer[] = [
    { id: 't-old', fromId: 'main', toId: 'revolut', amount: 300, amountTo: 300, date: '2026-10-01', createdAt: '2026-10-01T09:00:00.000Z' },
    { id: 't-new', fromId: 'main', toId: 'revolut', amount: 100, amountTo: 100, date: '2026-10-07', createdAt: '2026-10-07T09:00:00.000Z' },
    { id: 't-goal', fromId: 'revolut', toId: 'goal', amount: 250, amountTo: 250, date: '2026-10-08', createdAt: '2026-10-08T09:00:00.000Z' },
    { id: 't-eur', fromId: 'main', toId: 'eur', amount: 430, amountTo: 100, date: '2026-10-09', createdAt: '2026-10-09T09:00:00.000Z' },
  ];
  const planned: PlannedExpense = { id: 'pl1', amount: 120, categoryId: 'cat-other', comment: 'Gift', startDate: null, endDate: null, createdAt: '2026-10-01T00:00:00.000Z' } as PlannedExpense;
  const recurring: RecurringExpense = { id: 'r1', amount: 50, categoryId: 'cat-other', comment: 'Spotify', freq: 'monthly', interval: 1, weekdays: null, nextDueDate: '2026-11-03', createdAt: '2026-09-03T00:00:00.000Z' };
  return input(
    {
      accounts: [revolut, eurCash, goal],
      transfers,
      expenses: [
        // Main card: before the hand-set Bank (already inside it), after it, dated in the future.
        expense({ id: 'old', amount: 300, date: '2026-10-02', createdAt: '2026-10-02T10:00:00.000Z' }),
        expense({ id: 'new', amount: 80, date: '2026-10-06', createdAt: '2026-10-06T10:00:00.000Z' }),
        expense({ id: 'future', amount: 900, date: '2026-10-30', createdAt: '2026-10-06T11:00:00.000Z' }),
        // Logged after setAt but dated before it (charged at createdAt in v1).
        expense({ id: 'backdated', amount: 40, date: '2026-10-01', createdAt: '2026-10-08T10:00:00.000Z' }),
        // Other accounts.
        expense({ id: 'rev', amount: 60, accountId: 'revolut', date: '2026-10-03', createdAt: '2026-10-03T10:00:00.000Z' }),
        expense({ id: 'eur-spent', amount: 20, accountId: 'eur', date: '2026-10-10', createdAt: '2026-10-10T10:00:00.000Z' }),
        // A spending plan: its reserve and overspend.
        expense({ id: 'reserve', amount: 800, planId: 'p1', planRole: 'reserve', date: '2026-10-06', createdAt: '2026-10-06T12:00:00.000Z' }),
      ],
      spendPlans: [plan({ id: 'p1', limit: 800, reserveExpenseId: 'reserve' })],
      planSpends: [spend({ id: 's1', amount: 300 }), spend({ id: 's2', amount: 150 })],
      plannedExpenses: [planned],
      recurringExpenses: [recurring],
      workDays: [workDay('2026-08-04'), workDay('2026-09-03'), workDay('2026-09-04')],
    },
    {
      // August was confirmed after Bank was typed in (counted in v1 Bank on top); September is still awaited.
      salaryConfirmations: { '2026-08-01': { amount: 300, confirmedAt: '2026-10-06T08:00:00.000Z' } },
      salaryAccountId: 'main',
      savingsCard: 'on',
      savingsBalance: 5000,
      savingsRatePercent: 5,
      savingsOpenedAt: '2026-03-01',
    }
  );
}

describe('finance v1 → v2 migration', () => {
  it('every balance is exactly what it was', () => {
    const out = migrateFinance(busyPhone());
    for (const [id, { before, after }] of Object.entries(out.balances)) {
      expect([id, after]).toEqual([id, before]);
    }
    // And recomputed independently from what gets written to the database.
    const primary = out.accounts.find((a) => a.isPrimary)!;
    const data = { expenses: out.expensesUpsert, incomes: out.incomes, adjustments: out.adjustments, transfers: out.transfers };
    for (const a of out.accounts) expect(balanceOf(a.id, data, primary.id, '2026-10-20')).toBe(out.balances[a.id].before);
  });

  it('the main card shows what is really in it: plans no longer hold money back', () => {
    const out = migrateFinance(busyPhone());
    const primary = out.accounts.find((a) => a.isPrimary)!;
    // v1: 2000 − 80 − 40 − 800 (reserve) + 300 (salary) − 100 − 430 = 850 free, + 350 unspent in the plan.
    expect(out.balances[primary.id].before).toBe(1200);
    expect(primary.name).toBe('PKO');
  });

  it('the future-dated expense still comes off on its day, once', () => {
    const out = migrateFinance(busyPhone());
    const primary = out.accounts.find((a) => a.isPrimary)!;
    const data = { expenses: out.expensesUpsert, incomes: out.incomes, adjustments: out.adjustments, transfers: out.transfers };
    expect(balanceOf(primary.id, data, primary.id, '2026-10-30')).toBe(1200 - 900);
  });

  it('old expenses stay for statistics; plan purchases become expenses; plan records go', () => {
    const out = migrateFinance(busyPhone());
    expect(out.expensesDelete).toEqual(['reserve']);
    const ids = out.expensesUpsert.map((e) => e.id);
    expect(ids).toEqual(expect.arrayContaining(['old', 'new', 'future', 'backdated', 'rev', 'eur-spent']));
    const purchases = out.expensesUpsert.filter((e) => e.comment === 'Food' && e.categoryId === 'cat-food');
    expect(purchases.map((e) => e.amount).sort()).toEqual([150, 300]);
    expect(out.expensesUpsert.every((e) => e.accountId && e.planRole === null)).toBe(true);
  });

  it('the plan limit becomes the category budget; an existing budget is kept', () => {
    const out = migrateFinance(busyPhone());
    expect(out.categories.find((c) => c.id === 'cat-food')?.limitMonth).toBe(800);
    expect(out.categories.find((c) => c.id === 'cat-other')?.limitMonth).toBe(200);
  });

  it('planned and recurring expenses become upcoming payments', () => {
    const out = migrateFinance(busyPhone());
    expect(out.upcoming.map((u) => [u.id, u.mode, u.date])).toEqual([
      ['pl1', 'month', '2026-10-01'],
      ['r1', 'repeat', '2026-11-03'],
    ]);
  });

  it('confirmed salaries become incomes, no doubles; the awaited one keeps waiting', () => {
    const inp = busyPhone();
    const out = migrateFinance(inp);
    expect(out.incomes.map((i) => [i.periodKey, i.amount])).toEqual([['2026-08-01', 300]]);
    const settings = { ...inp.settings, ...out.settingsPatch };
    const awaiting = payrollState(inp.workDays, settings, NOW).awaiting.map((p) => p.key);
    expect(awaiting).toEqual(['2026-09-01']);
  });

  it('a period v1 treated as already in Bank is marked answered instead of asked again', () => {
    // August paid on 10.09, Bank typed in on 05.10 → v1 never asked; v2 must not start asking.
    const inp = input({ workDays: [workDay('2026-08-04')] });
    const out = migrateFinance(inp);
    const settings = { ...inp.settings, ...out.settingsPatch };
    expect(payrollState(inp.workDays, settings, NOW).awaiting).toEqual([]);
    expect(out.incomes).toEqual([]);
  });

  it('savings from settings become a savings account with its rate', () => {
    const out = migrateFinance(busyPhone());
    const savings = out.accounts.find((a) => a.kind === 'savings')!;
    expect(savings.ratePercent).toBe(5);
    expect(savings.openedAt).toBe('2026-03-01');
    expect(out.balances[savings.id].after).toBe(5000);
    expect(out.settingsPatch.savingsCard).toBe('off');
  });

  it('a fresh install gets a primary card with 0 and nothing else', () => {
    const out = migrateFinance(input({}, { bankBalanceBase: 0, bankBalanceSetAt: null, mainAccountName: '' }));
    expect(out.accounts.map((a) => [a.kind, a.isPrimary])).toEqual([['card', true]]);
    expect(Object.values(out.balances)[0]).toEqual({ before: 0, after: 0 });
  });

  it('re-points the salary account and transfers from "main"', () => {
    const out = migrateFinance(busyPhone());
    const primary = out.accounts.find((a) => a.isPrimary)!;
    expect(out.settingsPatch.salaryAccountId).toBe(primary.id);
    expect(out.transfers.filter((t) => t.fromId === 'main' || t.toId === 'main')).toEqual([]);
  });
});
