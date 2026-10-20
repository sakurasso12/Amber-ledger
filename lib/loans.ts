import { addMonths, differenceInCalendarDays } from 'date-fns';
import { Loan } from '@/types';
import { parseDateKey, toDateKey } from './dateRanges';

/** Loans at most. */
export const MAX_LOANS = 3;
/** The reminder comes this many days before a payment. */
export const LOAN_REMINDER_DAYS = 5;

const monthlyRate = (loan: Loan) => loan.ratePercent / 100 / 12;

/**
 * The fixed monthly payment (annuity — how banks usually count it). Without interest it's just the
 * amount split evenly.
 */
export function monthlyPayment(loan: Loan): number {
  if (loan.months <= 0) return 0;
  const r = monthlyRate(loan);
  if (r === 0) return loan.principal / loan.months;
  return (loan.principal * r) / (1 - Math.pow(1 + r, -loan.months));
}

/** What's still owed after the payments made so far. */
export function remainingDebt(loan: Loan): number {
  const k = Math.min(loan.paidCount, loan.months);
  if (k >= loan.months) return 0;
  const r = monthlyRate(loan);
  const pay = monthlyPayment(loan);
  if (r === 0) return Math.max(0, loan.principal - pay * k);
  const grown = Math.pow(1 + r, k);
  return Math.max(0, loan.principal * grown - (pay * (grown - 1)) / r);
}

/** Everything paid over the whole term minus the amount borrowed. */
export function totalInterest(loan: Loan): number {
  return Math.max(0, monthlyPayment(loan) * loan.months - loan.principal);
}

export function isPaidOff(loan: Loan): boolean {
  return loan.paidCount >= loan.months;
}

/** yyyy-MM-dd of the next payment due (null once it's paid off). A short month moves it to its last day. */
export function nextPaymentDate(loan: Loan): string | null {
  if (isPaidOff(loan)) return null;
  return toDateKey(addMonths(parseDateKey(loan.firstPayment), loan.paidCount));
}

/** Days from `today` to the next payment (negative = overdue). */
export function daysToPayment(loan: Loan, today: Date = new Date()): number | null {
  const next = nextPaymentDate(loan);
  return next ? differenceInCalendarDays(parseDateKey(next), today) : null;
}
