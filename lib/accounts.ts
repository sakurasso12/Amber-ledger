import { Account, AppSettings, Expense, Transfer } from '@/types';
import { countsInBalance } from './expenses';
import { todayKey } from './dateRanges';

/**
 * The main card: the old "Bank" figure kept in settings (bankBalanceBase / bankBalanceSetAt). It
 * isn't a row in the accounts table; expenses and transfers point at it with this id (or null).
 * Spending plans and quick-add always use it.
 */
export const MAIN_ACCOUNT_ID = 'main';

/** Cards at most, the main one included. */
export const MAX_CARDS = 3;
/** Stashes at most. */
export const MAX_STASHES = 5;
/** Goals at most. */
export const MAX_GOALS = 5;

/** Can you pay with it / move money between these? (Not a stash or a goal.) */
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
export function accountName(account: Account, labels: { card: string; cash: string; stash: string; goal: string }): string {
  return account.name.trim() || labels[account.kind];
}

/** Currency an expense was paid in (an expense of a removed account falls back to the app's). */
export function expenseCurrency(expense: Expense, accounts: Account[], appCurrency: string): string {
  if (isMainExpense(expense)) return appCurrency;
  return accounts.find((a) => a.id === expense.accountId)?.currency ?? appCurrency;
}

/**
 * Totals, stats and budget limits are in the app currency — money spent from a wallet in another
 * currency (€ cash on a trip) is left out of them instead of being added up as if it were złoty.
 */
export function inAppCurrency(expenses: Expense[], accounts: Account[], appCurrency: string): Expense[] {
  if (accounts.every((a) => a.currency === appCurrency)) return expenses;
  return expenses.filter((e) => expenseCurrency(e, accounts, appCurrency) === appCurrency);
}
