import { dueIncomes, paymentsIn, upcomingIncomes } from '@/lib/incomes';
import { IncomeSource } from '@/types/settings';
import { Income } from '@/types';

const pension = (fields: Partial<IncomeSource> = {}): IncomeSource => ({
  id: 'p1',
  name: 'Моя пенсія',
  kind: 'pension',
  amount: 2100,
  payDay: 10,
  advance: null,
  accountId: 'main',
  since: '2026-01-01',
  ...fields,
});
const NOW = new Date(2026, 10, 23, 12); // 23 Nov 2026

describe('regular incomes', () => {
  it('a pension is one payment a month on its day', () => {
    const p = paymentsIn([pension()], NOW);
    expect(p).toHaveLength(1);
    expect(p[0]).toMatchObject({ date: '2026-11-10', amount: 2100, key: 'inc:p1:2026-11' });
  });

  it('day 31 lands on the last day of a short month', () => {
    expect(paymentsIn([pension({ payDay: 31 })], NOW)[0].date).toBe('2026-11-30');
  });

  it('a fixed salary with an advance is two payments that add up', () => {
    const p = paymentsIn([pension({ kind: 'fixed', amount: 5000, payDay: 25, advance: { day: 10, amount: 2000 } })], NOW);
    expect(p.map((x) => [x.date, x.amount, x.advance])).toEqual([
      ['2026-11-10', 2000, true],
      ['2026-11-25', 3000, false],
    ]);
  });

  it('asks once the day came, until it is answered', () => {
    const sources = [pension(), pension({ id: 'p2', name: 'Пенсія чоловіка', payDay: 28 })];
    expect(dueIncomes(sources, [], NOW).map((p) => p.key)).toEqual(['inc:p1:2026-10', 'inc:p2:2026-10', 'inc:p1:2026-11']);
    const answered: Income[] = ['inc:p1:2026-10', 'inc:p2:2026-10', 'inc:p1:2026-11'].map((k, i) => ({
      id: String(i),
      accountId: 'main',
      amount: 2100,
      date: '2026-11-10',
      periodKey: k,
      createdAt: '',
    }));
    expect(dueIncomes(sources, answered, NOW)).toEqual([]);
  });

  it('payments before the source was added are not asked about', () => {
    expect(dueIncomes([pension({ since: '2026-11-23' })], [], NOW)).toEqual([]);
  });

  it('upcoming = the rest of this month', () => {
    const sources = [pension(), pension({ id: 'p2', payDay: 28, amount: 1900 })];
    expect(upcomingIncomes(sources, NOW).map((p) => [p.source.id, p.amount])).toEqual([['p2', 1900]]);
  });
});
