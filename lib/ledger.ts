import { endOfMonth, getDaysInMonth, setDate, startOfMonth, addMonths } from 'date-fns';
import { Adjustment, Category, Expense, Income, Loan, Transfer, Upcoming } from '@/types';
import { AppSettings } from '@/types/settings';
import { parseDateKey, toDateKey, todayKey } from './dateRanges';
import { nextOccurrenceDateKey } from './recurrence';
import { isPaidOff, monthlyPayment } from './loans';

/**
 * Finance v2: every balance is the SUM OF ITS RECORDS.
 *
 *   balance = adjustments + incomes − expenses ± transfers   (each counted from its own date on)
 *
 * Typing in the real balance doesn't reset anything — it adds an adjustment equal to the
 * difference (see correctionFor). So nothing can be subtracted twice: an expense is either in the
 * sum or it isn't, no matter when it was typed in.
 */

/** Everything a balance is made of. */
export interface LedgerData {
  expenses: Expense[];
  incomes: Income[];
  adjustments: Adjustment[];
  transfers: Transfer[];
}

/** Money is kept to the cent: 0.1 + 0.2 must not end up as 0.30000000000000004 on screen. */
export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** The account an expense was paid from; data from before v2 may still say null = primary. */
export function expenseAccountId(expense: Expense, primaryId: string): string {
  return expense.accountId ?? primaryId;
}

/** Balance of one account on `today` (records dated later don't count yet). */
export function balanceOf(accountId: string, data: LedgerData, primaryId: string, today: string = todayKey()): number {
  let sum = 0;
  for (const a of data.adjustments) if (a.accountId === accountId) sum += a.amount;
  for (const i of data.incomes) if (i.accountId === accountId && i.date <= today) sum += i.amount;
  for (const e of data.expenses) {
    if (e.date <= today && expenseAccountId(e, primaryId) === accountId) sum -= e.amount;
  }
  for (const t of data.transfers) {
    if (t.date > today) continue;
    if (t.toId === accountId) sum += t.amountTo;
    if (t.fromId === accountId) sum -= t.amount;
  }
  return round2(sum);
}

/** Spent from the account in a date range (inclusive keys) — for the "spent this month" line. */
export function spentFrom(accountId: string, expenses: Expense[], primaryId: string, from: string, to: string): number {
  return round2(
    expenses
      .filter((e) => expenseAccountId(e, primaryId) === accountId && e.date >= from && e.date <= to)
      .reduce((sum, e) => sum + e.amount, 0)
  );
}

/** The adjustment to add when the user says the account really holds `real`. */
export function correctionFor(real: number, current: number): number {
  return round2(real - current);
}

/** The latest balance check of an account (typed-in balance or the v2 opening), or null. */
export function lastCheck(accountId: string, adjustments: Adjustment[]): Adjustment | null {
  let last: Adjustment | null = null;
  for (const a of adjustments) {
    if (a.accountId !== accountId) continue;
    if (!last || a.date > last.date || (a.date === last.date && a.createdAt > last.createdAt)) last = a;
  }
  return last;
}

/**
 * A NEW record dated before the account's last balance check may already be inside the balance the
 * user typed in then — so it has to ask "was it already in?". (Same day: no — a balance typed in
 * today and expenses logged after it are the usual order.) Returns that check, or null.
 */
export function checkCovering(accountId: string, date: string, adjustments: Adjustment[]): Adjustment | null {
  const last = lastCheck(accountId, adjustments);
  return last && date < last.date ? last : null;
}

/**
 * An EXISTING record logged before the account's last balance check was known when that balance
 * was typed in — deleting or changing it has to ask whether to keep the balance. Returns the check.
 */
export function checkAfterRecord(accountId: string, recordCreatedAt: string, adjustments: Adjustment[]): Adjustment | null {
  const last = lastCheck(accountId, adjustments);
  return last && last.createdAt > recordCreatedAt ? last : null;
}

/**
 * The answer "yes, it was already in the balance I typed": the check's adjustment absorbs the
 * change so the balance stays where it was. `balanceDelta` is how the record moves the balance:
 * −amount for a new expense, +amount for a deleted one, (old − new) for a changed one.
 */
export function absorbInCheck(check: Adjustment, balanceDelta: number): Adjustment {
  return { ...check, amount: round2(check.amount - balanceDelta) };
}

// ---------------------------------------------------------------------------------------------
// Paydays and "until payday"

function clampDay(month: Date, day: number): Date {
  return setDate(month, Math.min(Math.max(1, Math.round(day) || 1), getDaysInMonth(month)));
}

/** Days of the month money arrives: the payday, plus the advance day with two payouts. Days from
 * 28 on mean "end of the month" for the advance split (see lib/earnings halfPayday). */
function paydaysIn(month: Date, settings: Pick<AppSettings, 'paydayDay' | 'advanceDay' | 'payoutsPerMonth'>): Date[] {
  const days = [settings.paydayDay];
  if (settings.payoutsPerMonth === 2) days.push(settings.advanceDay);
  return days.map((d) =>
    settings.payoutsPerMonth === 2 && d >= 28 ? setDate(month, getDaysInMonth(month)) : clampDay(month, d)
  );
}

/** The next day money arrives, strictly after `today`. */
export function nextPayday(
  settings: Pick<AppSettings, 'paydayDay' | 'advanceDay' | 'payoutsPerMonth'>,
  today: string = todayKey()
): string {
  const base = startOfMonth(parseDateKey(today));
  const candidates = [...paydaysIn(base, settings), ...paydaysIn(addMonths(base, 1), settings)]
    .map(toDateKey)
    .filter((k) => k > today)
    .sort();
  return candidates[0];
}

/** Occurrence dates of an upcoming payment from its current date up to `until` (inclusive). */
export function occurrencesUntil(item: Upcoming, until: string, max = 60): string[] {
  if (item.mode !== 'repeat' || !item.freq) return item.date <= until ? [item.date] : [];
  const out: string[] = [];
  let date = item.date;
  while (date <= until && out.length < max) {
    out.push(date);
    date = nextOccurrenceDateKey(item.freq, item.interval, item.weekdays, date);
  }
  return out;
}

/** Date of loan payment number `index` (0-based): the first payment's day, month after month. */
export function loanPaymentDate(loan: Loan, index: number): string {
  // Same as lib/loans nextPaymentDate: a short month moves it to its last day.
  return toDateKey(addMonths(parseDateKey(loan.firstPayment), index));
}

export interface CommittedItem {
  key: string;
  kind: 'expense' | 'upcoming' | 'loan' | 'budget';
  label: string;
  categoryId: string | null;
  amount: number;
  /** yyyy-MM-dd, or null for a budget's rest of the month. */
  date: string | null;
}

export interface CommittedInput {
  accountId: string;
  primaryId: string;
  expenses: Expense[];
  upcoming: Upcoming[];
  loans: Loan[];
  categories: Category[];
  /** Spending in the app currency (for budgets) — see useSpendingExpenses. */
  spending: Expense[];
  until: string;
  today?: string;
}

/**
 * Money already spoken for until `until` (the next payday): the grey "until payday" line is the
 * balance minus these. Loans and category budgets belong to the primary account.
 */
export function committedUntil(input: CommittedInput): CommittedItem[] {
  const today = input.today ?? todayKey();
  const { accountId, primaryId, until } = input;
  const isPrimary = accountId === primaryId;
  const items: CommittedItem[] = [];

  for (const e of input.expenses) {
    if (e.date > today && e.date <= until && expenseAccountId(e, primaryId) === accountId) {
      items.push({ key: `e-${e.id}`, kind: 'expense', label: e.comment ?? '', categoryId: e.categoryId, amount: e.amount, date: e.date });
    }
  }

  const upcomingThisMonth = new Map<string, number>();
  const monthEnd = toDateKey(endOfMonth(parseDateKey(today)));
  for (const u of input.upcoming) {
    if ((u.accountId ?? primaryId) !== accountId) continue;
    for (const date of occurrencesUntil(u, until)) {
      items.push({ key: `u-${u.id}-${date}`, kind: 'upcoming', label: u.comment ?? '', categoryId: u.categoryId, amount: u.amount, date });
      if (date <= monthEnd) upcomingThisMonth.set(u.categoryId, (upcomingThisMonth.get(u.categoryId) ?? 0) + u.amount);
    }
  }

  if (isPrimary) {
    for (const loan of input.loans) {
      if (isPaidOff(loan)) continue;
      const payment = round2(monthlyPayment(loan));
      for (let i = loan.paidCount; i < loan.months; i++) {
        const date = loanPaymentDate(loan, i);
        if (date > until) break;
        items.push({ key: `l-${loan.id}-${i}`, kind: 'loan', label: loan.name, categoryId: null, amount: payment, date });
      }
    }

    // A budget's unspent part this month is money you mean to spend; payments already listed in
    // the same category come off it so they aren't counted twice.
    const monthStart = toDateKey(startOfMonth(parseDateKey(today)));
    for (const c of input.categories) {
      if (!c.limitMonth) continue;
      const spent = input.spending
        .filter((e) => e.categoryId === c.id && e.date >= monthStart && e.date <= today)
        .reduce((sum, e) => sum + e.amount, 0);
      const rest = c.limitMonth - spent - (upcomingThisMonth.get(c.id) ?? 0);
      if (rest > 0) items.push({ key: `b-${c.id}`, kind: 'budget', label: c.name, categoryId: c.id, amount: round2(rest), date: null });
    }
  }

  return items.sort((a, b) => (a.date ?? '9999').localeCompare(b.date ?? '9999'));
}

export function sumItems(items: { amount: number }[]): number {
  return round2(items.reduce((sum, i) => sum + i.amount, 0));
}
