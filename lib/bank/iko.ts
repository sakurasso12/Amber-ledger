/**
 * Parses IKO (PKO BP) push notifications into bank transactions (personal build only, see
 * plugins/withIkoListener.js). Verified format (2026-11-21):
 *
 *   title: "Blokada kwoty pod transakcję"
 *   Kwota: 7,00 PLN.
 *   Konto: 78..9322                       ← never stored
 *   Lokalizacja: BLIK ZBLIŻENIOWY: BAMIS II
 *   Stan konta po transakcji: +876,39 PLN
 *
 * The amount has no sign, so the direction comes from the title, and failing that from how the
 * balance moved since the previous transaction.
 */
import type { RawIkoNotification } from '@/modules/iko-listener/src/IkoListener.types';

export type BankDirection = 'out' | 'in' | 'unknown';

export interface BankTx {
  /** Stable id from the native queue (hash of title + text). */
  id: string;
  /** ISO time the notification came. */
  at: string;
  amount: number;
  currency: string;
  direction: BankDirection;
  /** "BLIK ZBLIŻENIOWY", "BLIK INTERNET", … ('' when absent). */
  method: string;
  /** "BAMIS II", "ALLEGRO.PL", … ('' when absent). */
  merchant: string;
  /** Balance after the transaction, as the bank reports it (null when absent). */
  balance: number | null;
  title: string;
  /** Money the balance moved beyond this transaction since the previous one (lost notification?). */
  gap?: number | null;
}

/** "1 234,56" / "+876,39" / "-7,00" → number. */
export function parsePlAmount(s: string): number | null {
  const m = s.replace(/\s| /g, '').match(/^([+-]?)(\d+(?:\.\d{3})*|\d+)(?:,(\d{1,2}))?/);
  if (!m) return null;
  const whole = m[2].replace(/\./g, '');
  const n = parseFloat(`${whole}.${m[3] ?? '0'}`);
  if (!Number.isFinite(n)) return null;
  return m[1] === '-' ? -n : n;
}

function line(text: string, label: string): string | null {
  for (const raw of text.split('\n')) {
    const l = raw.trim();
    if (l.toLowerCase().startsWith(label.toLowerCase())) return l.slice(label.length).trim();
  }
  return null;
}

/** Titles that mean money went out / came in. Extend when new samples arrive. */
const OUT_TITLES = [/blokada kwoty/i, /obciążenie/i, /płatność/i, /wypłata/i, /przelew wychodzący/i];
const IN_TITLES = [/uznanie/i, /wpływ/i, /przelew przychodzący/i, /zwrot/i, /wpłata/i];

export function directionFromTitle(title: string): BankDirection {
  if (IN_TITLES.some((r) => r.test(title))) return 'in';
  if (OUT_TITLES.some((r) => r.test(title))) return 'out';
  return 'unknown';
}

export function parseIko(raw: RawIkoNotification): BankTx | null {
  const kwota = line(raw.text, 'Kwota:');
  if (!kwota) return null;
  const amountSigned = parsePlAmount(kwota);
  if (amountSigned === null) return null;
  const currency = (kwota.match(/[A-Z]{3}/) ?? ['PLN'])[0];

  const loc = line(raw.text, 'Lokalizacja:') ?? '';
  const cut = loc.lastIndexOf(':');
  const method = cut >= 0 ? loc.slice(0, cut).trim() : '';
  const merchant = (cut >= 0 ? loc.slice(cut + 1) : loc).trim();

  const stan = line(raw.text, 'Stan konta po transakcji:');
  const balance = stan ? parsePlAmount(stan) : null;

  let direction = directionFromTitle(raw.title);
  // A sign on the amount wins if the bank ever sends one.
  if (/^\s*-/.test(kwota)) direction = 'out';
  else if (/^\s*\+/.test(kwota)) direction = 'in';

  return {
    id: raw.id,
    at: new Date(raw.time).toISOString(),
    amount: Math.abs(amountSigned),
    currency,
    direction,
    method,
    merchant,
    balance,
    title: raw.title,
  };
}

/**
 * Fills 'unknown' directions from the balance: if the balance before (`prev`) minus the amount gives
 * this balance it was money out, plus — money in. Also tells whether the chain adds up.
 */
export function checkAgainstBalance(tx: BankTx, prev: number | null): { direction: BankDirection; gap: number | null } {
  if (prev === null || tx.balance === null) return { direction: tx.direction, gap: null };
  const cents = (n: number) => Math.round(n * 100);
  const delta = cents(tx.balance) - cents(prev);
  if (tx.direction === 'unknown') {
    if (delta === -cents(tx.amount)) return { direction: 'out', gap: 0 };
    if (delta === cents(tx.amount)) return { direction: 'in', gap: 0 };
    return { direction: 'unknown', gap: null };
  }
  const expected = tx.direction === 'out' ? -cents(tx.amount) : cents(tx.amount);
  return { direction: tx.direction, gap: (delta - expected) / 100 };
}
