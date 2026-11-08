import { endOfMonth, subDays } from 'date-fns';
import { Account, Loan, Upcoming } from '@/types';
import { AppSettings } from '@/types/settings';
import { PeriodEarnings } from './earnings';
import { parseDateKey, toDateKey, todayKey } from './dateRanges';
import { isSpendable } from './accounts';
import { isPaidOff, monthlyPayment } from './loans';
import { loanPaymentDate, round2 } from './ledger';

/**
 * "Awaiting answer": everything that was supposed to happen by now and needs a yes / other amount /
 * no from the user before it touches a balance — the salary, a loan payment, an upcoming payment,
 * the weekly balance check. One queue, one look, so nothing slips by silently.
 */
export type PendingItem =
  | { key: string; type: 'salary'; date: string; due: PeriodEarnings }
  | { key: string; type: 'upcoming'; date: string; upcoming: Upcoming }
  | { key: string; type: 'loan'; date: string; loan: Loan; amount: number }
  | { key: string; type: 'check'; date: string; account: Account };

export interface PendingInput {
  salaryDue: PeriodEarnings | null;
  upcoming: Upcoming[];
  loans: Loan[];
  accounts: Account[];
  settings: Pick<AppSettings, 'pendingSnoozed' | 'reconcileWeekday' | 'reconciledWeeks'>;
  now?: Date;
}

/** The weekly check's day this week: the last `weekday` on or before today. */
export function checkDay(weekday: number, today: string = todayKey()): string {
  const date = parseDateKey(today);
  const back = (date.getDay() - weekday + 7) % 7;
  return toDateKey(subDays(date, back));
}

/** When a "this month" payment counts as due: on the month's last day (it had no exact one). */
export function dueDateOf(u: Upcoming): string {
  return u.mode === 'month' ? toDateKey(endOfMonth(parseDateKey(u.date))) : u.date;
}

export function pendingItems(input: PendingInput): PendingItem[] {
  const now = input.now ?? new Date();
  const today = toDateKey(now);
  const items: PendingItem[] = [];

  if (input.salaryDue) {
    items.push({ key: `salary-${input.salaryDue.key}`, type: 'salary', date: toDateKey(input.salaryDue.payday), due: input.salaryDue });
  }

  for (const u of input.upcoming) {
    const date = dueDateOf(u);
    if (date <= today) items.push({ key: `upcoming-${u.id}-${u.date}`, type: 'upcoming', date, upcoming: u });
  }

  for (const loan of input.loans) {
    if (isPaidOff(loan)) continue;
    const date = loanPaymentDate(loan, loan.paidCount);
    if (date <= today) {
      items.push({ key: `loan-${loan.id}-${loan.paidCount}`, type: 'loan', date, loan, amount: round2(monthlyPayment(loan)) });
    }
  }

  const weekday = input.settings.reconcileWeekday;
  if (weekday !== null && weekday !== undefined) {
    const day = checkDay(weekday, today);
    for (const account of input.accounts.filter(isSpendable)) {
      // Not for an account added on or after this week's check day — its balance was just typed in.
      if (account.createdAt.slice(0, 10) >= day) continue;
      if ((input.settings.reconciledWeeks[account.id] ?? '') >= day) continue;
      items.push({ key: `check-${account.id}-${day}`, type: 'check', date: day, account });
    }
  }

  const nowIso = now.toISOString();
  return items
    .filter((i) => !(input.settings.pendingSnoozed[i.key] && input.settings.pendingSnoozed[i.key] > nowIso))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** "Not yet": hidden until the start of tomorrow. */
export function snoozeUntilTomorrow(now: Date = new Date()): string {
  const t = new Date(now);
  t.setHours(24, 0, 0, 0);
  return t.toISOString();
}
