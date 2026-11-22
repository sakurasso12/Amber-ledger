/**
 * Personal build only: pulls IKO notifications queued by the native listener
 * (modules/iko-listener) into settings.bankPending, where Finance asks "add / skip" for each.
 */
import IkoListener from '@/modules/iko-listener/src/IkoListenerModule';
import type { RawIkoNotification } from '@/modules/iko-listener/src/IkoListener.types';
import { useSettingsStore } from '@/store/useSettingsStore';
import { BankTx, checkAgainstBalance, parseIko } from './iko';

/** Set by the "personal" EAS profile; false in every public build. */
export const BANK_FEATURE = process.env.EXPO_PUBLIC_PERSONAL === '1';

/** The listener service is in this build (Android, personal build). */
export function bankAvailable(): boolean {
  if (!BANK_FEATURE || !IkoListener) return false;
  try {
    return IkoListener.isAvailable();
  } catch {
    return false;
  }
}

export function bankAccessGranted(): boolean {
  try {
    return bankAvailable() && !!IkoListener?.isEnabled();
  } catch {
    return false;
  }
}

export function openBankAccessSettings(): void {
  IkoListener?.openSettings();
}

/** Moves new notifications into the pending queue. Returns how many were added. */
export function pullBankTransactions(): number {
  if (!bankAvailable()) return 0;
  let raw: RawIkoNotification[] = [];
  try {
    raw = JSON.parse(IkoListener!.takePending());
  } catch {
    return 0;
  }
  if (raw.length === 0) return 0;

  const { settings, updateSettings } = useSettingsStore.getState();
  const known = new Set(settings.bankPending.map((t) => t.id));
  let prev = settings.bankLastBalance;
  const added: BankTx[] = [];
  for (const r of raw.sort((a, b) => a.time - b.time)) {
    const tx = parseIko(r);
    if (!tx || known.has(tx.id)) continue;
    const { direction, gap } = checkAgainstBalance(tx, prev);
    added.push({ ...tx, direction, gap });
    if (tx.balance !== null) prev = tx.balance;
  }
  if (added.length > 0) {
    updateSettings({ bankPending: [...settings.bankPending, ...added], bankLastBalance: prev });
  }
  return added.length;
}

/** Removes an answered transaction from the queue (optionally remembering its category). */
export function resolveBankTx(id: string, remember?: { merchant: string; categoryId: string }): void {
  const { settings, updateSettings } = useSettingsStore.getState();
  updateSettings({
    bankPending: settings.bankPending.filter((t) => t.id !== id),
    ...(remember && remember.merchant
      ? { bankCategoryByMerchant: { ...settings.bankCategoryByMerchant, [remember.merchant.toUpperCase()]: remember.categoryId } }
      : {}),
  });
}
