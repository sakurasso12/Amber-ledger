import { Notifications } from './expoNotifications';
import { setHours, startOfDay } from 'date-fns';
import { AppSettings } from '@/types';
import { PayrollState } from '@/lib/earnings';
import { formatRangeLabel } from '@/lib/dateRanges';
import { getTranslation } from '@/i18n';
import { hasNotificationPermission } from './permissions';

const SALARY_REMINDER_ID = 'salary-prompt';
/** Hour of the day the payday reminder fires on (the snooze reminder fires exactly 24h later). */
const PAYDAY_REMINDER_HOUR = 10;

/**
 * Keeps one "did your salary arrive?" reminder scheduled: at the end of a snooze if the prompt is
 * snoozed, otherwise on the morning of the next payday that hasn't come yet. Nothing is scheduled
 * while the prompt is already showing or when there's nothing to wait for. Safe to call often.
 */
export async function syncSalaryReminder(payroll: PayrollState, settings: AppSettings): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(SALARY_REMINDER_ID).catch(() => {});
  if (!settings.notificationsEnabled || !(await hasNotificationPermission())) return;

  const now = new Date();
  const snoozedUntil = settings.salaryPromptSnoozedUntil ? new Date(settings.salaryPromptSnoozedUntil) : null;

  let target: Date | null = null;
  let subject = payroll.due;
  if (payroll.due) {
    if (snoozedUntil && snoozedUntil > now) target = snoozedUntil;
  } else {
    subject = payroll.awaiting[0] ?? null;
    if (subject) {
      const paydayMorning = setHours(startOfDay(subject.payday), PAYDAY_REMINDER_HOUR);
      target = paydayMorning > now ? paydayMorning : null;
    }
  }
  if (!target || !subject) return;

  const tr = getTranslation();
  const amount = `${subject.amount.toFixed(0)} ${settings.currency}`;
  const period = formatRangeLabel(subject.period, tr.localeCode);
  await Notifications.scheduleNotificationAsync({
    identifier: SALARY_REMINDER_ID,
    content: { title: tr.salaryPrompt.notificationTitle, body: tr.salaryPrompt.notificationBody(amount, period) },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: target },
  });
}
