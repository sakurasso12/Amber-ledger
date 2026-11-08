import { Account, Adjustment, Category, Income, Loan, Transfer, Upcoming } from '@/types';
import { DEFAULT_SETTINGS } from '@/types/settings';
import {
  absorbInCheck,
  balanceOf,
  checkAfterRecord,
  checkCovering,
  committedUntil,
  correctionFor,
  LedgerData,
  nextPayday,
  occurrencesUntil,
  sumItems,
} from '@/lib/ledger';
import { inAppCurrency, rateFromTransfer } from '@/lib/accounts';
import { pendingItems } from '@/lib/pending';
import { payrollState } from '@/lib/earnings';
import { expense } from './factories';

const P = 'pko';

function account(fields: Partial<Account> = {}): Account {
  return {
    id: P,
    kind: 'card',
    name: 'PKO',
    currency: 'zł',
    base: 0,
    setAt: null,
    target: null,
    sortOrder: 0,
    createdAt: '2026-10-01T08:00:00.000Z',
    isPrimary: true,
    ratePercent: null,
    openedAt: null,
    ...fields,
  };
}

function adj(fields: Partial<Adjustment> = {}): Adjustment {
  return { id: 'a1', accountId: P, amount: 1000, date: '2026-10-01', kind: 'opening', note: null, createdAt: '2026-10-01T08:00:00.000Z', ...fields };
}

function income(fields: Partial<Income> = {}): Income {
  return { id: 'i1', accountId: P, amount: 4000, date: '2026-10-10', periodKey: '2026-09-01', createdAt: '2026-10-10T08:00:00.000Z', ...fields };
}

function transfer(fields: Partial<Transfer> = {}): Transfer {
  return { id: 't1', fromId: P, toId: 'cash', amount: 200, amountTo: 200, date: '2026-10-05', createdAt: '2026-10-05T08:00:00.000Z', ...fields };
}

function upcoming(fields: Partial<Upcoming> = {}): Upcoming {
  return {
    id: 'u1',
    amount: 900,
    categoryId: 'cat-housing',
    accountId: null,
    comment: 'Rent',
    mode: 'date',
    date: '2026-10-30',
    freq: null,
    interval: 1,
    weekdays: null,
    createdAt: '2026-10-01T08:00:00.000Z',
    ...fields,
  };
}

const ledger = (fields: Partial<LedgerData> = {}): LedgerData => ({ expenses: [], incomes: [], adjustments: [], transfers: [], ...fields });
const mine = (fields = {}) => expense({ accountId: P, ...fields });

describe('balance = sum of records', () => {
  it('adds adjustments and incomes, takes off expenses and outgoing transfers', () => {
    const data = ledger({
      adjustments: [adj({ amount: 1000 })],
      incomes: [income({ amount: 4000 })],
      expenses: [mine({ amount: 150 })],
      transfers: [transfer({ amount: 200 }), transfer({ id: 't2', fromId: 'cash', toId: P, amount: 50, amountTo: 50 })],
    });
    expect(balanceOf(P, data, P, '2026-10-20')).toBe(1000 + 4000 - 150 - 200 + 50);
  });

  it('counts a record only from its own date on', () => {
    const data = ledger({ adjustments: [adj()], expenses: [mine({ amount: 900, date: '2026-10-30' })] });
    expect(balanceOf(P, data, P, '2026-10-29')).toBe(1000);
    expect(balanceOf(P, data, P, '2026-10-30')).toBe(100);
  });

  it('keeps cents exact', () => {
    const data = ledger({ expenses: [mine({ amount: 0.1 }), mine({ id: 'e2', amount: 0.2 })] });
    expect(balanceOf(P, data, P, '2026-10-20')).toBe(-0.3);
  });

  it('treats an expense without an account (data from before v2) as the primary one', () => {
    const data = ledger({ expenses: [expense({ accountId: null, amount: 10 })] });
    expect(balanceOf(P, data, P, '2026-10-20')).toBe(-10);
    expect(balanceOf('cash', data, P, '2026-10-20')).toBe(0);
  });
});

describe('typing in the real balance (correction)', () => {
  it('saves the difference, and the balance becomes what was typed', () => {
    const data = ledger({ adjustments: [adj({ amount: 1240 })] });
    const c = correctionFor(1180, balanceOf(P, data, P, '2026-10-12'));
    expect(c).toBe(-60);
    const after = ledger({ adjustments: [...data.adjustments, adj({ id: 'c1', kind: 'correction', amount: c, date: '2026-10-12' })] });
    expect(balanceOf(P, after, P, '2026-10-12')).toBe(1180);
  });

  it('THE OLD BUG: an expense added after the balance was typed in is taken off once, not twice', () => {
    // Had 1000; spent 100 on the 5th but forgot to log it; on the 12th typed the real 900.
    let data = ledger({ adjustments: [adj({ amount: 1000 })] });
    const c = correctionFor(900, balanceOf(P, data, P, '2026-10-12'));
    const check = adj({ id: 'c1', kind: 'correction', amount: c, date: '2026-10-12', createdAt: '2026-10-12T09:00:00.000Z' });
    data = ledger({ adjustments: [data.adjustments[0], check] });
    // Then logs the forgotten 100 dated the 5th → the app asks, the answer is "already in".
    const forgot = mine({ amount: 100, date: '2026-10-05', createdAt: '2026-10-12T10:00:00.000Z' });
    const covering = checkCovering(P, forgot.date, data.adjustments);
    expect(covering?.id).toBe('c1');
    const absorbed = absorbInCheck(covering!, -forgot.amount);
    const after = ledger({ adjustments: [data.adjustments[0], absorbed], expenses: [forgot] });
    expect(balanceOf(P, after, P, '2026-10-12')).toBe(900);
  });

  it('"not in it yet": the back-dated expense is taken off', () => {
    const data = ledger({ adjustments: [adj({ amount: 900, date: '2026-10-12' })], expenses: [mine({ amount: 100, date: '2026-10-05' })] });
    expect(balanceOf(P, data, P, '2026-10-12')).toBe(800);
  });

  it('deleting an old expense: "keep the balance" vs "give the money back"', () => {
    const old = mine({ amount: 100, date: '2026-10-05' });
    const check = adj({ amount: 1000, date: '2026-10-12' });
    const kept = ledger({ adjustments: [absorbInCheck(check, +old.amount)] });
    expect(balanceOf(P, kept, P, '2026-10-12')).toBe(900); // same as with the expense
    expect(balanceOf(P, ledger({ adjustments: [check], expenses: [old] }), P, '2026-10-12')).toBe(900);
    expect(balanceOf(P, ledger({ adjustments: [check] }), P, '2026-10-12')).toBe(1000); // given back
  });

  it('asks about a new record only when it is dated before the last check', () => {
    const adjustments = [adj({ date: '2026-10-01' }), adj({ id: 'c2', kind: 'correction', date: '2026-10-12' })];
    expect(checkCovering(P, '2026-10-11', adjustments)?.id).toBe('c2');
    expect(checkCovering(P, '2026-10-12', adjustments)).toBeNull(); // same day: logged after the check
    expect(checkCovering('cash', '2026-10-01', adjustments)).toBeNull();
  });

  it('asks about deleting a record only if it existed when the balance was checked', () => {
    const adjustments = [adj({ id: 'c2', kind: 'correction', date: '2026-10-12', createdAt: '2026-10-12T09:00:00.000Z' })];
    expect(checkAfterRecord(P, '2026-10-11T10:00:00.000Z', adjustments)?.id).toBe('c2');
    expect(checkAfterRecord(P, '2026-10-12T10:00:00.000Z', adjustments)).toBeNull();
  });

  it('two corrections in a row', () => {
    let data = ledger({ adjustments: [adj({ amount: 500 })] });
    for (const [real, day] of [[480, '2026-10-05'], [470, '2026-10-06']] as const) {
      const c = correctionFor(real, balanceOf(P, data, P, day));
      data = ledger({ adjustments: [...data.adjustments, adj({ id: `c-${day}`, amount: c, date: day, kind: 'correction' })] });
      expect(balanceOf(P, data, P, day)).toBe(real);
    }
  });

  it('a new month changes nothing', () => {
    const data = ledger({ adjustments: [adj()], expenses: [mine({ amount: 100, date: '2026-10-31' })] });
    expect(balanceOf(P, data, P, '2026-11-01')).toBe(balanceOf(P, data, P, '2026-10-31'));
  });
});

describe('until payday', () => {
  const pay = { ...DEFAULT_SETTINGS, paydayDay: 10, payoutsPerMonth: 1 as const, advanceDay: 25 };

  it('finds the next payday strictly after today', () => {
    expect(nextPayday(pay, '2026-10-05')).toBe('2026-10-10');
    expect(nextPayday(pay, '2026-10-10')).toBe('2026-11-10');
    expect(nextPayday({ ...pay, payoutsPerMonth: 2, advanceDay: 25 }, '2026-10-12')).toBe('2026-10-25');
    expect(nextPayday({ ...pay, paydayDay: 31 }, '2026-02-03')).toBe('2026-02-28');
  });

  it('counts future-dated expenses, upcoming payments, loan payments and the rest of budgets', () => {
    const loan: Loan = { id: 'l1', name: 'Phone', principal: 1200, ratePercent: 0, months: 12, firstPayment: '2026-09-15', paidCount: 1, currency: 'zł', createdAt: '' };
    const food: Category = { id: 'cat-food', name: 'Food', color: '#000', isDefault: true, sortOrder: 0, limitMonth: 800 };
    const items = committedUntil({
      accountId: P,
      primaryId: P,
      expenses: [mine({ amount: 50, date: '2026-10-20' }), mine({ id: 'later', amount: 999, date: '2026-11-20' })],
      upcoming: [upcoming({ amount: 900, date: '2026-10-30' }), upcoming({ id: 'gym', amount: 100, mode: 'repeat', freq: 'weekly', date: '2026-10-21' })],
      loans: [loan],
      categories: [food],
      spending: [mine({ amount: 300, categoryId: 'cat-food', date: '2026-10-03' })],
      until: '2026-11-10',
      today: '2026-10-15',
    });
    // 50 on the 20th; rent 900 + gym on 21, 28 Oct and 4 Nov; loan payment no. 2 on 15 Oct (15 Nov is
    // after payday); food budget 800 − 300 already spent.
    const byKind = (k: string) => sumItems(items.filter((i) => i.kind === k));
    expect(byKind('expense')).toBe(50);
    expect(byKind('upcoming')).toBe(900 + 300);
    expect(byKind('loan')).toBe(100);
    expect(byKind('budget')).toBe(500);
  });

  it('occurrences of a repeating payment', () => {
    expect(occurrencesUntil(upcoming({ mode: 'repeat', freq: 'monthly', date: '2026-01-31' }), '2026-04-30').length).toBeGreaterThanOrEqual(3);
    expect(occurrencesUntil(upcoming({ mode: 'date', date: '2026-12-01' }), '2026-11-30')).toEqual([]);
  });
});

describe('salary', () => {
  const s = { ...DEFAULT_SETTINGS, hourlyRate: 30, hoursPerShift: 10, payPeriodStartDay: 1, paydayDay: 10, payoutsPerMonth: 1 as const };
  const day = (date: string) => ({ id: date, date, isWorked: true, hoursOverride: null, hourlyRateOverride: null });

  it('a closed period waits until its salary is confirmed, however long that takes', () => {
    const work = [day('2026-09-03'), day('2026-09-04')];
    const before = payrollState(work, s, new Date('2026-10-20T12:00:00'));
    expect(before.awaiting.map((p) => p.amount)).toEqual([600]);
    expect(before.due?.key).toBe('2026-09-01');
    const after = payrollState(work, { ...s, salaryConfirmations: { '2026-09-01': { amount: 600, confirmedAt: '', accountId: P } } }, new Date('2026-10-20T12:00:00'));
    expect(after.awaiting).toEqual([]);
  });

  it('typing in the balance no longer hides an unconfirmed salary', () => {
    const work = [day('2026-09-03')];
    const st = payrollState(work, { ...s, bankBalanceSetAt: '2026-10-15T00:00:00.000Z' }, new Date('2026-10-20T12:00:00'));
    expect(st.awaiting.length).toBe(1);
  });

  it('advance and the rest are two payouts', () => {
    const two = { ...s, payoutsPerMonth: 2 as const, advanceDay: 20, paydayDay: 5 };
    const st = payrollState([day('2026-09-03'), day('2026-09-25')], two, new Date('2026-10-30T12:00:00'));
    expect(st.awaiting.length).toBe(2);
  });

  it('shows up in "awaiting answer"', () => {
    const st = payrollState([day('2026-09-03')], s, new Date('2026-10-20T12:00:00'));
    const items = pendingItems({ salaryDue: st.due, upcoming: [], loans: [], accounts: [], settings: { ...s, reconcileWeekday: null }, now: new Date('2026-10-20T12:00:00') });
    expect(items.map((i) => i.type)).toEqual(['salary']);
  });
});

describe('awaiting answer', () => {
  const base = { ...DEFAULT_SETTINGS, reconcileWeekday: null as number | null };
  const now = new Date('2026-10-20T12:00:00');

  it('lists payments whose day came, loans due, and hides snoozed ones', () => {
    const loan: Loan = { id: 'l1', name: 'Phone', principal: 1200, ratePercent: 0, months: 12, firstPayment: '2026-10-15', paidCount: 0, currency: 'zł', createdAt: '' };
    const items = pendingItems({
      salaryDue: null,
      upcoming: [upcoming({ date: '2026-10-19' }), upcoming({ id: 'later', date: '2026-10-25' }), upcoming({ id: 'm', mode: 'month', date: '2026-09-01' })],
      loans: [loan],
      accounts: [],
      settings: base,
      now,
    });
    expect(items.map((i) => i.key).sort()).toEqual(['loan-l1-0', 'upcoming-m-2026-09-01', 'upcoming-u1-2026-10-19']);
    const snoozed = pendingItems({ salaryDue: null, upcoming: [upcoming({ date: '2026-10-19' })], loans: [], accounts: [], settings: { ...base, pendingSnoozed: { 'upcoming-u1-2026-10-19': '2026-10-21T00:00:00.000Z' } }, now });
    expect(snoozed).toEqual([]);
  });

  it('weekly check: asks each card once a week from its day on', () => {
    const card = account({ createdAt: '2026-09-01T00:00:00.000Z' });
    const ask = (reconciledWeeks: Record<string, string>) =>
      pendingItems({ salaryDue: null, upcoming: [], loans: [], accounts: [card, account({ id: 'goal', kind: 'goal', isPrimary: false })], settings: { ...base, reconcileWeekday: 0, reconciledWeeks }, now });
    // 20.10.2026 is a Tuesday → this week's check day is Sunday 18.10.
    expect(ask({}).map((i) => i.key)).toEqual(['check-pko-2026-10-18']);
    expect(ask({ [P]: '2026-10-18' })).toEqual([]);
  });
});

describe('currencies', () => {
  const eur = account({ id: 'eur', currency: '€', isPrimary: false, kind: 'cash' });

  it('a transfer between złoty and euro tells the rate', () => {
    expect(rateFromTransfer('zł', '€', 430, 100, 'zł')).toEqual(['€', 4.3]);
    expect(rateFromTransfer('€', 'zł', 100, 425, 'zł')).toEqual(['€', 4.25]);
    expect(rateFromTransfer('zł', 'zł', 10, 10, 'zł')).toBeNull();
  });

  it('statistics convert with the rate saved on the expense, so a later rate change keeps them', () => {
    const e = expense({ accountId: 'eur', amount: 10, rate: 4.3 });
    expect(inAppCurrency([e], [account(), eur], 'zł', { '€': 5 })[0].amount).toBe(43);
    expect(inAppCurrency([expense({ accountId: 'eur', amount: 10 })], [account(), eur], 'zł', { '€': 5 })[0].amount).toBe(50);
    expect(inAppCurrency([expense({ accountId: 'eur', amount: 10 })], [account(), eur], 'zł', {})).toEqual([]);
  });
});
