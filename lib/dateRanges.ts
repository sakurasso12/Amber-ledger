import {
  addDays,
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  getDaysInMonth,
  isWithinInterval,
  parseISO,
  setDate,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
  subWeeks,
} from 'date-fns';

/** ISO date-only key (yyyy-MM-dd), used as the storage/comparison format for dates without time. */
export function toDateKey(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function todayKey(): string {
  return toDateKey(new Date());
}

export function parseDateKey(key: string): Date {
  return parseISO(key);
}

const weekOptions = { weekStartsOn: 1 as const };

export interface DateRange {
  start: Date;
  end: Date;
}

export function weekRange(date: Date): DateRange {
  return { start: startOfWeek(date, weekOptions), end: endOfWeek(date, weekOptions) };
}

export function monthRange(date: Date): DateRange {
  return { start: startOfMonth(date), end: endOfMonth(date) };
}

/**
 * Most recent occurrence of `day`-of-month on or before `date` (clamped to the length of a short
 * month, e.g. day 31 becomes the 28th/29th in February). Used to figure out when the last payday
 * was, independent of the work-period boundaries.
 */
export function mostRecentMonthlyDay(date: Date, day: number): Date {
  const clampedTarget = Math.max(1, Math.min(31, Math.round(day) || 1));
  const dayInMonth = (base: Date): Date => setDate(startOfMonth(base), Math.min(clampedTarget, getDaysInMonth(base)));

  const thisMonth = dayInMonth(date);
  if (thisMonth <= date) return thisMonth;
  return dayInMonth(subMonths(date, 1));
}

/**
 * Custom pay-period range containing `date`, starting on `startDay` of each month (clamped to
 * the length of a short month, e.g. day 31 becomes the 28th/29th in February). `startDay: 1`
 * degenerates to the plain calendar month. E.g. `startDay: 15` gives Aug 15 – Sep 14, Sep 15 –
 * Oct 14, and so on.
 */
export function payPeriodRange(date: Date, startDay: number): DateRange {
  const start = mostRecentMonthlyDay(date, startDay);
  const nextStart = mostRecentMonthlyDay(addMonths(start, 1), startDay);
  const end = endOfDay(subDays(nextStart, 1));
  return { start, end };
}

export function isDateKeyInRange(dateKey: string, range: DateRange): boolean {
  return isWithinInterval(parseDateKey(dateKey), { start: range.start, end: range.end });
}

export function daysInRange(range: DateRange): Date[] {
  return eachDayOfInterval(range);
}

/** Last `count` week ranges ending with the week containing `date`, oldest first. */
export function lastNWeeks(date: Date, count: number): DateRange[] {
  const ranges: DateRange[] = [];
  for (let i = count - 1; i >= 0; i--) {
    ranges.push(weekRange(subWeeks(date, i)));
  }
  return ranges;
}

export function nextWeek(range: DateRange): DateRange {
  return weekRange(addWeeks(range.start, 1));
}

export function addDaysToKey(dateKey: string, days: number): string {
  return toDateKey(addDays(parseDateKey(dateKey), days));
}

/** Short "D MMM" label for a single date, e.g. "15 Sep". */
export function formatShortDate(date: Date, localeCode: string): string {
  return date.toLocaleDateString(localeCode, { day: 'numeric', month: 'short' });
}

/** Short "D MMM – D MMM" label for a date range, e.g. "15 Aug – 14 Sep". */
export function formatRangeLabel(range: DateRange, localeCode: string): string {
  return `${formatShortDate(range.start, localeCode)} – ${formatShortDate(range.end, localeCode)}`;
}
