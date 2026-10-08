/** Polish "podatek Belki": 19% is withheld from interest on savings accounts and deposits. */
export const INTEREST_TAX = 0.19;

export interface SavingsProjection {
  /** The next anniversary of the opening date (today counts as not yet passed). */
  yearEnds: Date;
  /** Balance expected on that date, after tax. */
  projected: number;
  /** Interest earned until then, after tax. */
  interest: number;
}

/**
 * Rough projection to the account's next anniversary: monthly capitalisation (how most Polish
 * savings accounts work), 19% tax taken off the interest. A rough guide, not a bank statement.
 */
export function projectSavings(
  balance: number,
  ratePercent: number,
  openedAt: string,
  now: Date = new Date()
): SavingsProjection {
  const opened = new Date(`${openedAt}T00:00:00`);
  const yearEnds = new Date(opened);
  yearEnds.setFullYear(now.getFullYear());
  if (yearEnds <= now) yearEnds.setFullYear(now.getFullYear() + 1);

  const monthsLeft = (yearEnds.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * (365.25 / 12));
  const grossFactor = Math.pow(1 + ratePercent / 100 / 12, monthsLeft);
  const interest = balance * (grossFactor - 1) * (1 - INTEREST_TAX);
  return { yearEnds, projected: balance + interest, interest };
}
