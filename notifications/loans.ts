import { Notifications } from './expoNotifications';
import { setHours, startOfDay, subDays } from 'date-fns';
import { AppSettings, Loan } from '@/types';
import { LOAN_REMINDER_DAYS, monthlyPayment, nextPaymentDate } from '@/lib/loans';
import { parseDateKey } from '@/lib/dateRanges';
import { getTranslation } from '@/i18n';
import { hasNotificationPermission } from './permissions';

const ID_PREFIX = 'loan-payment-';
/** Hour of the day the reminder fires on. */
const REMINDER_HOUR = 10;

/**
 * One reminder per loan, LOAN_REMINDER_DAYS before its next payment (in the morning). Reminders
 * of removed or paid-off loans are cancelled. Safe to call often.
 */
export async function syncLoanReminders(loans: Loan[], settings: AppSettings): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync().catch(() => []);
  for (const n of scheduled) {
    if (n.identifier.startsWith(ID_PREFIX)) await Notifications.cancelScheduledNotificationAsync(n.identifier).catch(() => {});
  }
  if (!settings.notificationsEnabled || !(await hasNotificationPermission())) return;

  const tr = getTranslation();
  const now = new Date();
  for (const loan of loans) {
    const next = nextPaymentDate(loan);
    if (!next) continue;
    const day = parseDateKey(next);
    const target = setHours(startOfDay(subDays(day, LOAN_REMINDER_DAYS)), REMINDER_HOUR);
    if (target <= now) continue;
    const amount = `${monthlyPayment(loan).toFixed(0)} ${loan.currency}`;
    const date = day.toLocaleDateString(tr.localeCode, { day: 'numeric', month: 'long' });
    await Notifications.scheduleNotificationAsync({
      identifier: `${ID_PREFIX}${loan.id}`,
      content: { title: tr.loans.reminderTitle, body: tr.loans.reminderBody(loan.name || tr.loans.title, amount, date) },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: target },
    });
  }
}
