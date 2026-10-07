import type { Translation } from '@/i18n/translations';

/** Colours of a home screen widget — comes from the active design (theme/designs.ts). */
export interface WidgetPalette {
  background: string;
  text: string;
  textMuted: string;
  accent: string;
  danger: string;
  radius: number;
}

/** Compact deadline label — just the time if it's today, otherwise "DD.MM HH:MM". */
export function widgetDeadlineLabel(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  if (d.toDateString() === now.toDateString()) return time;
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')} ${time}`;
}

/** "2 д 4 ч" / "3 ч 15 мин" / "25 мин" — two biggest units of a duration. */
export function formatDuration(ms: number, tr: Translation['homeWidgets']): string {
  const totalMinutes = Math.max(1, Math.round(Math.abs(ms) / 60000));
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return hours > 0 ? `${days} ${tr.days} ${hours} ${tr.hours}` : `${days} ${tr.days}`;
  if (hours > 0) return minutes > 0 ? `${hours} ${tr.hours} ${minutes} ${tr.minutes}` : `${hours} ${tr.hours}`;
  return `${minutes} ${tr.minutes}`;
}
