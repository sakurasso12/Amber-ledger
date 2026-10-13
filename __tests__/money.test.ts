import { computeBankBalance, totalExpenses } from '@/lib/expenses';
import { needsMonthEndChoice, overspendOf, planRatio, spendingExpenses, spentInPeriod, unspentInPlans } from '@/lib/plans';
import { expense, plan, spend } from './factories';

describe('bank', () => {
  it('takes off only expenses logged after the amount was set by hand', () => {
    const expenses = [
      expense({ id: 'old', amount: 300, createdAt: '2026-10-01T10:00:00.000Z' }),
      expense({ id: 'new', amount: 50, createdAt: '2026-10-05T10:00:00.000Z' }),
    ];
    const { bank, spentSinceSet } = computeBankBalance(expenses, 1000, '2026-10-03T00:00:00.000Z');
    expect(spentSinceSet).toBe(50);
    expect(bank).toBe(950);
  });

  it('counts every expense while the amount was never set', () => {
    expect(computeBankBalance([expense({ amount: 120 })], 0, null).bank).toBe(-120);
  });
});

describe('spending plans', () => {
  const food = plan({ limit: 800 });
  const reserve = expense({ id: 'reserve', amount: 800, planId: 'p1', planRole: 'reserve' });
  const coffee = expense({ id: 'coffee', amount: 20, categoryId: 'cat-fun' });

  it('adds up purchases of the current period only', () => {
    const spends = [spend({ amount: 300 }), spend({ id: 's2', amount: 45 }), spend({ id: 'old', amount: 999, period: -1 })];
    expect(spentInPeriod(food, spends)).toBe(345);
  });

  it('goes past 100 % and logs only the extra as overspend', () => {
    expect(planRatio(food, 880)).toBeCloseTo(1.1);
    expect(overspendOf(food, 880)).toBe(80);
    expect(overspendOf(food, 500)).toBe(0);
  });

  it('counts purchases as spending, not the whole limit', () => {
    const spending = spendingExpenses([reserve, coffee], [food], [spend({ amount: 300 })]);
    expect(totalExpenses(spending)).toBe(320); // 300 bought for food + 20 coffee, not 800 + 20
    expect(spending.find((e) => e.id === 'reserve')).toBeUndefined();
  });

  it('keeps the unspent part of a limit as money still in the account', () => {
    expect(unspentInPlans([food], [spend({ amount: 300 })])).toBe(500);
    expect(unspentInPlans([food], [spend({ amount: 900 })])).toBe(0);
  });

  it('asks about next month from the last day of the month, not on the day it started', () => {
    expect(needsMonthEndChoice(plan({ periodStart: '2026-10-01' }), '2026-10-30')).toBe(false);
    expect(needsMonthEndChoice(plan({ periodStart: '2026-10-01' }), '2026-10-31')).toBe(true);
    expect(needsMonthEndChoice(plan({ periodStart: '2026-10-31' }), '2026-10-31')).toBe(false);
  });
});
