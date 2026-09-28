import { addDays, addMonths, addWeeks, isAfter, parseISO } from 'date-fns';
import { RecurrenceFreq, RecurrenceRule } from '@/types';
import { toDateKey } from './dateRanges';

/**
 * Given the deadline of a just-completed recurring task instance, compute the deadline of the
 * next instance per its recurrence rule. Returns null if the rule has no `until` overrun or if
 * there's nothing to schedule (no deadline to anchor from, or `until` has passed).
 */
export function nextOccurrence(rule: RecurrenceRule, fromDeadlineAt: string | null): string | null {
  if (!fromDeadlineAt) return null;

  const from = parseISO(fromDeadlineAt);
  const interval = Math.max(1, rule.interval || 1);
  const until = rule.until ? parseISO(rule.until) : null;

  let next: Date;
  if (rule.freq === 'daily') {
    next = addDays(from, interval);
  } else if (rule.freq === 'weekly') {
    next = nextWeeklyOccurrence(from, interval, rule.weekdays);
  } else {
    next = addMonths(from, interval);
  }

  if (until && isAfter(next, until)) return null;
  return next.toISOString();
}

/** Same recurrence math as nextOccurrence, but for date-only keys (yyyy-MM-dd) — used by
 * recurring expenses, which don't have a time-of-day component. */
export function nextOccurrenceDateKey(
  freq: RecurrenceFreq,
  interval: number,
  weekdays: number[] | null,
  fromDateKey: string
): string {
  const rule: RecurrenceRule = { freq, interval, weekdays, until: null };
  const nextIso = nextOccurrence(rule, `${fromDateKey}T00:00:00.000Z`);
  return toDateKey(parseISO(nextIso!));
}

function nextWeeklyOccurrence(from: Date, interval: number, weekdays: number[] | null): Date {
  if (!weekdays || weekdays.length === 0) {
    return addWeeks(from, interval);
  }

  const sorted = [...weekdays].sort((a, b) => a - b);
  const fromDay = from.getDay();

  const laterThisWeek = sorted.find((d) => d > fromDay);
  if (laterThisWeek !== undefined) {
    return addDays(from, laterThisWeek - fromDay);
  }

  const daysUntilStartOfNextCycle = 7 - fromDay + sorted[0];
  return addDays(from, daysUntilStartOfNextCycle + 7 * (interval - 1));
}
