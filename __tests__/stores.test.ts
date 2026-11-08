import { useFinanceStore } from '@/store/useFinanceStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useTaskStore } from '@/store/useTaskStore';
import { balanceOf } from '@/lib/ledger';
import { addDaysToKey, todayKey } from '@/lib/dateRanges';
import { Account } from '@/types';
import { expense, task } from './factories';

const MAIN: Account = {
  id: 'main-card',
  kind: 'card',
  name: 'PKO',
  currency: 'zł',
  base: 0,
  setAt: null,
  target: null,
  sortOrder: 0,
  createdAt: '2026-01-01T00:00:00.000Z',
  isPrimary: true,
  ratePercent: null,
  openedAt: null,
};

/** The main card as the Finance screen shows it. */
function bank(): number {
  return balanceOf(MAIN.id, useFinanceStore.getState(), MAIN.id);
}

/** The main card with 1000 on it (checked yesterday), nothing else. */
function startWithBank(amount = 1000) {
  const yesterday = addDaysToKey(todayKey(), -1);
  useFinanceStore.setState({
    accounts: [MAIN],
    expenses: [],
    incomes: [],
    transfers: [],
    upcoming: [],
    loans: [],
    adjustments: [{ id: 'open', accountId: MAIN.id, amount, date: yesterday, kind: 'opening', note: null, createdAt: `${yesterday}T08:00:00.000Z` }],
  });
  useSettingsStore.getState().updateSettings({ financeModel: 2, currencyRates: {}, pendingSnoozed: {}, reconciledWeeks: {} });
  useTaskStore.setState({ tasks: [] });
}

describe('balances (finance v2)', () => {
  beforeEach(() => startWithBank());

  it('a new expense comes off once, deleting it gives the money back', async () => {
    await useFinanceStore.getState().addExpense({ amount: 3900, categoryId: 'cat-other', date: todayKey(), comment: 'uni' });
    expect(bank()).toBe(-2900);
    expect(useFinanceStore.getState().expenses[0].accountId).toBe(MAIN.id);
    await useFinanceStore.getState().removeExpense(useFinanceStore.getState().expenses[0].id);
    expect(bank()).toBe(1000);
  });

  it('typing in the real balance saves a correction, and nothing is subtracted twice afterwards', async () => {
    await useFinanceStore.getState().addExpense({ amount: 100, categoryId: 'cat-food', date: todayKey(), comment: null });
    await useFinanceStore.getState().setAccountBalance(MAIN.id, 850);
    expect(bank()).toBe(850);
    // The forgotten expense from three days ago, "already in the balance I typed".
    await useFinanceStore.getState().addExpense(
      { amount: 50, categoryId: 'cat-food', date: addDaysToKey(todayKey(), -3), comment: null },
      { alreadyCounted: true }
    );
    expect(bank()).toBe(850);
    // Another one that wasn't.
    await useFinanceStore.getState().addExpense({ amount: 20, categoryId: 'cat-food', date: addDaysToKey(todayKey(), -3), comment: null });
    expect(bank()).toBe(830);
  });

  it('deleting an old expense: keep the balance, or return the money', async () => {
    useFinanceStore.setState((s) => ({ expenses: [expense({ id: 'old', amount: 300, accountId: MAIN.id, date: addDaysToKey(todayKey(), -5) }), ...s.expenses] }));
    expect(bank()).toBe(700);
    await useFinanceStore.getState().removeExpense('old', { alreadyCounted: true });
    expect(bank()).toBe(700);
    startWithBank();
    useFinanceStore.setState((s) => ({ expenses: [expense({ id: 'old', amount: 300, accountId: MAIN.id, date: addDaysToKey(todayKey(), -5) }), ...s.expenses] }));
    await useFinanceStore.getState().removeExpense('old');
    expect(bank()).toBe(1000);
  });

  it('deleting a done task gives back the expense it logged', async () => {
    useTaskStore.setState({ tasks: [task({ id: 'uni', expenseOnComplete: { categoryId: 'cat-other', amount: 3900 } })] });
    await useTaskStore.getState().setStatus('uni', 'done');
    expect(bank()).toBe(-2900);
    await useTaskStore.getState().removeTask('uni');
    expect(bank()).toBe(1000);
  });

  it('salary: confirmed into the chosen account as an income', async () => {
    await useFinanceStore.getState().confirmSalary('2026-09-01', 4000, MAIN.id);
    expect(bank()).toBe(5000);
    expect(useSettingsStore.getState().settings.salaryConfirmations['2026-09-01'].amount).toBe(4000);
  });

  it('an upcoming payment touches nothing until it is answered; a repeating one moves on', async () => {
    await useFinanceStore.getState().addUpcoming({
      amount: 50, categoryId: 'cat-other', accountId: null, comment: 'Spotify', mode: 'repeat', date: todayKey(), freq: 'monthly', interval: 1, weekdays: null,
    });
    expect(bank()).toBe(1000);
    const u = useFinanceStore.getState().upcoming[0];
    await useFinanceStore.getState().answerUpcoming(u.id, 50);
    expect(bank()).toBe(950);
    expect(useFinanceStore.getState().upcoming[0].date > todayKey()).toBe(true);
    await useFinanceStore.getState().answerUpcoming(u.id, null); // "didn't happen": skipped, no money
    expect(bank()).toBe(950);
  });

  it('a transfer between złoty and euro remembers the rate', async () => {
    const eur: Account = { ...MAIN, id: 'eur', kind: 'cash', currency: '€', isPrimary: false };
    useFinanceStore.setState((s) => ({ accounts: [...s.accounts, eur] }));
    await useFinanceStore.getState().addTransfer({ fromId: MAIN.id, toId: 'eur', amount: 430, amountTo: 100, date: todayKey() });
    expect(bank()).toBe(570);
    expect(balanceOf('eur', useFinanceStore.getState(), MAIN.id)).toBe(100);
    expect(useSettingsStore.getState().settings.currencyRates['€']).toBe(4.3);
    // An expense from the euro wallet keeps that rate for statistics.
    await useFinanceStore.getState().addExpense({ amount: 10, categoryId: 'cat-food', date: todayKey(), comment: null, accountId: 'eur' });
    expect(useFinanceStore.getState().expenses[0].rate).toBe(4.3);
  });

  it('the main card cannot be removed', async () => {
    await useFinanceStore.getState().removeAccount(MAIN.id);
    expect(useFinanceStore.getState().accounts.map((a) => a.id)).toEqual([MAIN.id]);
  });
});
