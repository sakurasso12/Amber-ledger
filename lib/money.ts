import { useSettingsStore } from '@/store/useSettingsStore';

/**
 * A money amount for display: whole numbers stay whole ("120"), anything with kopecks/grosze shows
 * both digits ("48 048,50" → "48048,50"). Ukrainian/Russian/Polish use a decimal comma, English a dot.
 */
export function fmtAmount(n: number): string {
  const cents = Math.round(Math.abs(n) * 100);
  const sign = n < 0 && cents > 0 ? '-' : '';
  const whole = Math.floor(cents / 100);
  const rest = cents % 100;
  if (rest === 0) return `${sign}${whole}`;
  const sep = useSettingsStore.getState().settings.language === 'en' ? '.' : ',';
  return `${sign}${whole}${sep}${String(rest).padStart(2, '0')}`;
}

/** The value to prefill an amount input with: "1200" or "1200.5" (inputs accept both , and .). */
export function amountDraft(n: number): string {
  return String(Math.round(n * 100) / 100);
}
