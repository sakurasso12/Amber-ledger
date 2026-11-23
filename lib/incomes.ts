import { endOfMonth, startOfMonth, subMonths } from 'date-fns';
import { Income } from '@/types';
import { IncomeSource } from '@/types/settings';
import { toDateKey } from './dateRanges';

/**
 * Regular incomes (1.8): pensions, a fixed salary, anything paid the same every month. On its day
 * each payment joins "Awaiting answer" — "Пенсія прийшла?" — and a yes records an income on its
 * account, marked with periodKey `inc:<source>:<yyyy-MM>[:adv]`, which is how it's known as answered.
 */
export interface IncomePayment {
  key: string;
  source: IncomeSource;
  /** yyyy-MM-dd it arrives. */
  date: string;
  amount: number;
  /** The advance of a two-part salary. */
  advance: boolean;
}

const monthKey = (d: Date) => toDateKey(d).slice(0, 7);

/** A day of the month, held to the month's length (31 → 30 Nov). */
function dayIn(month: Date, day: number): Date {
  const last = endOfMonth(month).getDate();
  return new Date(month.getFullYear(), month.getMonth(), Math.min(Math.max(1, day), last), 12);
}

/** Every payment of the sources in a month: one per source, two with an advance. */
export function paymentsIn(sources: IncomeSource[], month: Date): IncomePayment[] {
  const m = startOfMonth(month);
  const out: IncomePayment[] = [];
  for (const source of sources) {
    if (!(source.amount > 0)) continue;
    const base = `inc:${source.id}:${monthKey(m)}`;
    const adv = source.kind === 'fixed' && source.advance && source.advance.amount > 0 ? source.advance : null;
    if (adv) {
      out.push({ key: `${base}:adv`, source, date: toDateKey(dayIn(m, adv.day)), amount: Math.min(adv.amount, source.amount), advance: true });
    }
    out.push({ key: base, source, date: toDateKey(dayIn(m, source.payDay)), amount: Math.max(0, source.amount - (adv ? adv.amount : 0)), advance: false });
  }
  return out.filter((p) => p.amount > 0).sort((a, b) => a.date.localeCompare(b.date));
}

/** Payments whose day came (this month and last) and that nobody answered yet. */
export function dueIncomes(sources: IncomeSource[], incomes: Income[], now: Date = new Date()): IncomePayment[] {
  const today = toDateKey(now);
  const answered = new Set(incomes.map((i) => i.periodKey).filter(Boolean) as string[]);
  return [...paymentsIn(sources, subMonths(now, 1)), ...paymentsIn(sources, now)].filter(
    (p) => p.date <= today && p.date >= (p.source.since || '0000') && !answered.has(p.key)
  );
}

/** What's still to come this month (after today), for "Скоро прийде". */
export function upcomingIncomes(sources: IncomeSource[], now: Date = new Date()): IncomePayment[] {
  const today = toDateKey(now);
  return paymentsIn(sources, now).filter((p) => p.date > today);
}
