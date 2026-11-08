import { Account, AppSettings, Expense, Transfer } from '@/types';
import { countsInBalance } from './expenses';
import { todayKey } from './dateRanges';

/**
 * LEGACY (before finance v2): the main card was not a row but the "Bank" figure in settings
 * (bankBalanceBase / bankBalanceSetAt), and expenses/transfers pointed at it with this id (or null).
 * Only the v2 migration still reads it; since v2 the main card is an `accounts` row with
 * `isPrimary` (see primaryAccount).
 */
export const MAIN_ACCOUNT_ID = 'main';

/** The account used by default (quick-add, salary, new records). */
export function primaryAccount(accounts: Account[]): Account | undefined {
  return accounts.find((a) => a.isPrimary) ?? accounts.find((a) => a.kind === 'card');
}

/** Id of the primary account ('' before the v2 migration created it). */
export function primaryId(accounts: Account[]): string {
  return primaryAccount(accounts)?.id ?? '';
}

/** Cards at most, the main one included. */
export const MAX_CARDS = 3;
/** Stashes at most. */
export const MAX_STASHES = 5;
/** Goals at most. */
export const MAX_GOALS = 5;

/** Can you pay with it / move money between these? (Not a stash, goal or savings.) */
export function isSpendable(account: Account): boolean {
  return account.kind === 'card' || account.kind === 'cash';
}

export function accountIdOf(expense: Expense): string {
  return expense.accountId ?? MAIN_ACCOUNT_ID;
}

/** Was this expense paid from the main card? (Expenses of a removed account count nowhere.) */
export function isMainExpense(expense: Expense): boolean {
  return accountIdOf(expense) === MAIN_ACCOUNT_ID;
}

/** Counts after `setAt` (everything when the balance was never set). */
const after = (createdAt: string, setAt: string | null) => !setAt || createdAt > setAt;

/** Money in minus money out through transfers since the balance was last typed in. */
export function transfersNet(accountId: string, transfers: Transfer[], setAt: string | null): number {
  let net = 0;
  for (const t of transfers) {
    if (!after(t.createdAt, setAt)) continue;
    if (t.toId === accountId) net += t.amountTo;
    if (t.fromId === accountId) net -= t.amount;
  }
  return net;
}

/** Salaries confirmed into this account since its balance was last typed in. */
export function salaryCredited(settings: AppSettings, accountId: string, setAt: string | null): number {
  return Object.values(settings.salaryConfirmations)
    .filter((c) => (c.accountId ?? MAIN_ACCOUNT_ID) === accountId && after(c.confirmedAt, setAt))
    .reduce((sum, c) => sum + c.amount, 0);
}

export interface AccountBalance {
  balance: number;
  spentSinceSet: number;
}

/** A card or cash wallet: typed-in base − its expenses since + transfers since + salary since. */
export function accountBalance(
  account: Account,
  expenses: Expense[],
  transfers: Transfer[],
  settings: AppSettings,
  today: string = todayKey()
): AccountBalance {
  const spentSinceSet = expenses
    .filter((e) => e.accountId === account.id && countsInBalance(e, account.setAt, today))
    .reduce((sum, e) => sum + e.amount, 0);
  const balance =
    account.base -
    spentSinceSet +
    transfersNet(account.id, transfers, account.setAt) +
    salaryCredited(settings, account.id, account.setAt);
  return { balance, spentSinceSet };
}

/** Bank name of the main card, or the generic word when the user hasn't named it. */
export function mainAccountName(settings: AppSettings, fallback: string): string {
  return settings.mainAccountName.trim() || fallback;
}

/** Display name: the bank name, or "Card" / "Cash" / ... when it's empty. */
export function accountName(
  account: Account,
  labels: { card: string; cash: string; stash: string; goal: string; savings: string }
): string {
  return account.name.trim() || labels[account.kind];
}

/** Currency an expense was paid in (an expense of a removed account falls back to the app's). */
export function expenseCurrency(expense: Expense, accounts: Account[], appCurrency: string): string {
  if (!expense.accountId || expense.accountId === MAIN_ACCOUNT_ID) return appCurrency;
  return accounts.find((a) => a.id === expense.accountId)?.currency ?? appCurrency;
}

/**
 * Totals, stats and budget limits are in the app currency. Money spent from a wallet in another
 * currency (€ cash on a trip) is converted: with the rate saved on the expense, else the current one
 * from Settings → Currencies. Without any rate it's left out rather than added up as if it were złoty.
 */
export function inAppCurrency(
  expenses: Expense[],
  accounts: Account[],
  appCurrency: string,
  rates: Record<string, number> = {}
): Expense[] {
  if (accounts.every((a) => a.currency === appCurrency)) return expenses;
  const out: Expense[] = [];
  for (const e of expenses) {
    const currency = expenseCurrency(e, accounts, appCurrency);
    if (currency === appCurrency) {
      out.push(e);
      continue;
    }
    const rate = e.rate ?? rates[currency];
    if (rate && rate > 0) out.push({ ...e, amount: Math.round(e.amount * rate * 100) / 100 });
  }
  return out;
}

/** Rate saved on a new expense paid from `accountId` (null when it's in the app currency). */
export function rateForAccount(
  accountId: string | null | undefined,
  accounts: Account[],
  appCurrency: string,
  rates: Record<string, number>
): number | null {
  const currency = accounts.find((a) => a.id === accountId)?.currency ?? appCurrency;
  if (currency === appCurrency) return null;
  return rates[currency] ?? null;
}

/**
 * A transfer between the app currency and another one tells the rate: 430 zł → 100 € = 4.3.
 * Returns [currency, rate] to remember, or null (same currencies / neither is the app's).
 */
export function rateFromTransfer(
  fromCurrency: string,
  toCurrency: string,
  amount: number,
  amountTo: number,
  appCurrency: string
): [string, number] | null {
  if (fromCurrency === toCurrency || amount <= 0 || amountTo <= 0) return null;
  if (fromCurrency === appCurrency) return [toCurrency, Math.round((amount / amountTo) * 10000) / 10000];
  if (toCurrency === appCurrency) return [fromCurrency, Math.round((amountTo / amount) * 10000) / 10000];
  return null;
}
