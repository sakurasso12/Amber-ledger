import { useFinanceStore } from '@/store/useFinanceStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useTaskStore } from '@/store/useTaskStore';
import { computeBankBalance } from '@/lib/expenses';
import { expense, task } from './factories';

/** The bank as the Finance screen shows it (salaries aside). */
function bank(): number {
  const { bankBalanceBase, bankBalanceSetAt } = useSettingsStore.getState().settings;
  return computeBankBalance(useFinanceStore.getState().expenses, bankBalanceBase, bankBalanceSetAt).bank;
}

/** Bank set by hand to 1000 just now, nothing else. */
function startWithBank(amount = 1000) {
  useSettingsStore.getState().updateSettings({ bankBalanceBase: amount, bankBalanceSetAt: new Date().toISOString() });
  useFinanceStore.setState({ expenses: [], spendPlans: [], planSpends: [] });
  useTaskStore.setState({ tasks: [] });
}

describe('money comes back', () => {
  beforeEach(() => startWithBank());

  it('deleting a new expense returns its money', async () => {
    await useFinanceStore.getState().addExpense({ amount: 3900, categoryId: 'cat-other', date: '2026-10-13', comment: 'uni' });
    expect(bank()).toBe(-2900);
    await useFinanceStore.getState().removeExpense(useFinanceStore.getState().expenses[0].id);
    expect(bank()).toBe(1000);
  });

  it('deleting an expense logged before the bank was set by hand returns its money too', async () => {
    useFinanceStore.setState({ expenses: [expense({ id: 'old', amount: 3900, createdAt: '2026-01-01T00:00:00.000Z' })] });
    expect(bank()).toBe(1000);
    await useFinanceStore.getState().removeExpense('old');
    expect(bank()).toBe(4900);
  });

  it('deleting a done task gives back the expense it logged', async () => {
    useTaskStore.setState({ tasks: [task({ id: 'uni', expenseOnComplete: { categoryId: 'cat-other', amount: 3900 } })] });
    await useTaskStore.getState().setStatus('uni', 'done');
    expect(bank()).toBe(-2900);
    await useTaskStore.getState().removeTask('uni');
    expect(bank()).toBe(1000);
  });

  it('a spending plan takes its whole limit at once, and deleting it gives it all back', async () => {
    await useFinanceStore.getState().createSpendPlan({ name: 'Food', categoryId: 'cat-food', limit: 800, date: '2026-10-13' });
    const planId = useFinanceStore.getState().spendPlans[0].id;
    await useFinanceStore.getState().addPlanSpend(planId, 300);
    expect(bank()).toBe(200); // 800 off at once; the 300 bought is inside it
    await useFinanceStore.getState().addPlanSpend(planId, 600);
    expect(bank()).toBe(100); // 100 over the limit comes off as overspend
    await useFinanceStore.getState().deleteSpendPlan(planId);
    expect(bank()).toBe(1000);
  });
});
