import { AppSettings, WorkDay } from '@/types';
import { DateRange, isDateKeyInRange } from './dateRanges';

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
