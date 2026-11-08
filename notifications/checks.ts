import { Notifications } from './expoNotifications';
import { AppSettings } from '@/types';
import { getTranslation } from '@/i18n';
import { hasNotificationPermission } from './permissions';

const CHECK_REMINDER_ID = 'weekly-balance-check';
const REMINDER_HOUR = 19;

/**
 * Finance v2 weekly balance check: one repeating reminder on the chosen weekday (evening — after
 * the day's spending), cancelled when the check is off. The question itself waits on Finance in
 * "Awaiting answer". Safe to call often.
 */
export async function syncCheckReminder(settings: AppSettings): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(CHECK_REMINDER_ID).catch(() => {});
  if (settings.reconcileWeekday === null || !settings.notificationsEnabled || !(await hasNotificationPermission())) return;
  const tr = getTranslation();
  await Notifications.scheduleNotificationAsync({
    identifier: CHECK_REMINDER_ID,
    content: { title: tr.money.checkNotifTitle, body: tr.money.checkNotifBody },
    // expo-notifications counts weekdays 1 = Sunday … 7 = Saturday.
    trigger: { type: Notifications.SchedulableTriggerInputTypes.WEEKLY, weekday: settings.reconcileWeekday + 1, hour: REMINDER_HOUR, minute: 0 },
  });
}
