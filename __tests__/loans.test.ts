import { DEFAULT_SETTINGS, Loan } from '@/types';
import { monthlyPayment, nextPaymentDate, remainingDebt, totalInterest } from '@/lib/loans';
import { paydayForPayout, payoutRange } from '@/lib/earnings';
import { parseDateKey, toDateKey } from '@/lib/dateRanges';

const loan = (fields: Partial<Loan> = {}): Loan => ({
  id: 'l1',
  name: 'Car',
  principal: 12000,
  ratePercent: 0,
  months: 12,
  firstPayment: '2026-01-31',
  paidCount: 0,
  currency: 'zł',
  createdAt: '2026-01-01T00:00:00.000Z',
  ...fields,
});

describe('loans', () => {
  it('splits a loan without interest evenly', () => {
    expect(monthlyPayment(loan())).toBe(1000);
    expect(remainingDebt(loan({ paidCount: 3 }))).toBe(9000);
    expect(totalInterest(loan())).toBe(0);
  });

  it('counts the annuity payment and what is left', () => {
    const l = loan({ ratePercent: 10 });
    expect(monthlyPayment(l)).toBeCloseTo(1054.99, 1);
    expect(remainingDebt({ ...l, paidCount: 12 })).toBe(0);
    expect(remainingDebt({ ...l, paidCount: 6 })).toBeGreaterThan(6000);
    expect(totalInterest(l)).toBeCloseTo(659.9, 0);
  });

  it('moves a payment on the 31st to the end of a short month', () => {
    expect(nextPaymentDate(loan({ paidCount: 1 }))).toBe('2026-02-28');
    expect(nextPaymentDate(loan({ paidCount: 12 }))).toBeNull();
  });
});

describe('advance + salary', () => {
  const settings = { ...DEFAULT_SETTINGS, payPeriodStartDay: 1, payoutsPerMonth: 2 as const, advanceDay: 15, paydayDay: 30 };

  it('pays the first 15 days on the advance day, the rest at the end of the month', () => {
    const first = payoutRange(parseDateKey('2026-10-05'), settings);
    expect(toDateKey(first.start)).toBe('2026-10-01');
    expect(toDateKey(first.end)).toBe('2026-10-15');
    expect(toDateKey(paydayForPayout(first, settings))).toBe('2026-10-15');

    const second = payoutRange(parseDateKey('2026-10-20'), settings);
    expect(toDateKey(second.start)).toBe('2026-10-16');
    expect(toDateKey(second.end)).toBe('2026-10-31');
    expect(toDateKey(paydayForPayout(second, settings))).toBe('2026-10-31');
  });

  it('keeps the whole period when paid once a month', () => {
    const once = { ...settings, payoutsPerMonth: 1 as const, paydayDay: 10 };
    const range = payoutRange(parseDateKey('2026-10-20'), once);
    expect(toDateKey(range.start)).toBe('2026-10-01');
    expect(toDateKey(paydayForPayout(range, once))).toBe('2026-11-10');
  });
});
