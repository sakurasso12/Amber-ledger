export interface SavingsProjection {
  /** The next anniversary of the opening date (today counts as not yet passed). */
  yearEnds: Date;
  /** Balance expected on that date, before tax. */
  projected: number;
  /** Interest earned until then, before tax. */
  interest: number;
}

/**
 * Rough projection to the account's next anniversary with monthly capitalisation, BEFORE tax on
 * interest — that rate differs by country (users are in Poland, Ukraine, the UK…), so the card
 * only reminds the user that tax will come off. A rough guide, not a bank statement.
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
  const interest = balance * (grossFactor - 1);
  return { yearEnds, projected: balance + interest, interest };
}
