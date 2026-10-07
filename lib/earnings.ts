import { addMonths, getDaysInMonth, setDate, startOfMonth } from 'date-fns';
import { AppSettings, WorkDay } from '@/types';
import { DateRange, isDateKeyInRange, parseDateKey, payPeriodRange, toDateKey } from './dateRanges';

/** Earnings for a single worked day: hours × rate, with per-day overrides falling back to settings. */
export function dayEarning(workDay: WorkDay, settings: AppSettings): number {
  if (!workDay.isWorked) return 0;
  const hours = workDay.hoursOverride ?? settings.hoursPerShift;
  const rate = workDay.hourlyRateOverride ?? settings.hourlyRate;
  return hours * rate;
}

export function totalEarnings(workDays: WorkDay[], settings: AppSettings, range?: DateRange): number {
  return workDays
    .filter((w) => w.isWorked && (!range || isDateKeyInRange(w.date, range)))
    .reduce((sum, w) => sum + dayEarning(w, settings), 0);
}

export interface EarningsPoint {
  label: string;
  date: string;
  amount: number;
}

/** One point per worked day in the range, for a bar/line chart. */
export function earningsByDay(workDays: WorkDay[], settings: AppSettings, range: DateRange): EarningsPoint[] {
  return workDays
    .filter((w) => w.isWorked && isDateKeyInRange(w.date, range))
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((w) => ({ label: w.date.slice(5), date: w.date, amount: dayEarning(w, settings) }));
}

export function earningsForRanges(
  workDays: WorkDay[],
  settings: AppSettings,
  ranges: { label: string; range: DateRange }[]
): EarningsPoint[] {
  return ranges.map(({ label, range }) => ({
    label,
    date: range.start.toISOString(),
    amount: totalEarnings(workDays, settings, range),
  }));
}

export function workedDaysCount(workDays: WorkDay[], range?: DateRange): number {
  return workDays.filter((w) => w.isWorked && (!range || isDateKeyInRange(w.date, range))).length;
}

/**
 * Day the salary for `period` arrives: the first `paydayDay` of a month that falls after the
 * period has closed (clamped to the length of a short month, like payPeriodRange). E.g. period
 * Sep 15 – Oct 14 with payday 25 → Oct 25; period Sep 1 – Sep 30 with payday 10 → Oct 10.
 */
export function paydayForPeriod(period: DateRange, paydayDay: number): Date {
  const day = Math.max(1, Math.min(31, Math.round(paydayDay) || 1));
  const inMonth = (month: Date): Date => setDate(month, Math.min(day, getDaysInMonth(month)));

  const sameMonth = inMonth(startOfMonth(period.end));
  if (sameMonth > period.end) return sameMonth;
  return inMonth(addMonths(startOfMonth(period.end), 1));
}

export interface PeriodEarnings {
  /** Pay period start date (yyyy-MM-dd) — the key used in settings.salaryConfirmations. */
  key: string;
  period: DateRange;
  amount: number;
  payday: Date;
}

export interface PayrollState {
  /** Closed periods whose salary hasn't been confirmed yet, oldest first — "Должно прийти". */
  awaiting: PeriodEarnings[];
  /** The current period plus any later ones with days marked in advance — still accruing,
   * shown greyed out. */
  accruing: { amount: number; range: DateRange };
  /** Oldest awaiting period whose payday has come — what the salary prompt asks about. */
  due: PeriodEarnings | null;
  /** Salaries confirmed after "Банк" was last set by hand — added to Bank. */
  creditedSinceSet: number;
}

/**
 * Where every worked day's money currently is. A closed period waits in "Должно прийти" until the
 * user confirms its salary arrived (the prompt starts on payday); the confirmed amount then goes
 * into Bank. Periods paid before the last manual Bank update are treated as already included in it.
 */
export function payrollState(workDays: WorkDay[], settings: AppSettings, now: Date = new Date()): PayrollState {
  const setAt = settings.bankBalanceSetAt ? new Date(settings.bankBalanceSetAt) : null;
  const currentPeriod = payPeriodRange(now, settings.payPeriodStartDay);

  const byPeriod = new Map<string, { period: DateRange; amount: number }>();
  for (const workDay of workDays) {
    if (!workDay.isWorked) continue;
    const period = payPeriodRange(parseDateKey(workDay.date), settings.payPeriodStartDay);
    const key = toDateKey(period.start);
    const entry = byPeriod.get(key) ?? { period, amount: 0 };
    entry.amount += dayEarning(workDay, settings);
    byPeriod.set(key, entry);
  }

  const awaiting: PeriodEarnings[] = [];
  let accruingAmount = 0;
  let accruingEnd = currentPeriod.end;

  for (const [key, { period, amount }] of byPeriod) {
    if (period.end >= now) {
      accruingAmount += amount;
      if (period.end > accruingEnd) accruingEnd = period.end;
      continue;
    }
    if (settings.salaryConfirmations[key]) continue;
    const payday = paydayForPeriod(period, settings.paydayDay);
    if (setAt && payday <= setAt) continue;
    awaiting.push({ key, period, amount, payday });
  }
  awaiting.sort((a, b) => a.period.start.getTime() - b.period.start.getTime());

  const creditedSinceSet = Object.values(settings.salaryConfirmations)
    .filter((c) => !setAt || new Date(c.confirmedAt) > setAt)
    .reduce((sum, c) => sum + c.amount, 0);

  return {
    awaiting,
    accruing: { amount: accruingAmount, range: { start: currentPeriod.start, end: accruingEnd } },
    due: awaiting.find((p) => p.payday <= now) ?? null,
    creditedSinceSet,
  };
}
