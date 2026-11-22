import { Platform } from 'react-native';
import { setHours, startOfDay, subDays } from 'date-fns';
import { Notifications } from './expoNotifications';
import { AppSettings, Upcoming } from '@/types';
import { parseDateKey } from '@/lib/dateRanges';
import { fmtAmount } from '@/lib/money';
import { subscriptionsOf } from '@/lib/subscriptions';
import { getTranslation } from '@/i18n';
import { hasNotificationPermission } from './permissions';

const ID_PREFIX = 'subscription-';
const REMINDER_HOUR = 10;
/** Android channels can't change their sound later, so the purr gets a channel of its own. */
const PURR_CHANNEL = 'subscriptions-purr';
const PLAIN_CHANNEL = 'subscriptions';

async function ensureChannels(): Promise<void> {
  if (Platform.OS !== 'android') return;
  const tr = getTranslation();
  await Notifications.setNotificationChannelAsync(PURR_CHANNEL, {
    name: tr.subscriptions.channelPurr,
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: 'purr.wav',
  }).catch(() => {});
  await Notifications.setNotificationChannelAsync(PLAIN_CHANNEL, {
    name: tr.subscriptions.channelPlain,
    importance: Notifications.AndroidImportance.DEFAULT,
  }).catch(() => {});
}

/**
 * One reminder per subscription, the morning of the day before its charge — with Тимофій's purr
 * when settings.purrNotifications is on. Safe to call often (cancels and re-schedules).
 */
export async function syncSubscriptionReminders(upcoming: Upcoming[], settings: AppSettings, currency: string): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync().catch(() => []);
  for (const n of scheduled) {
    if (n.identifier.startsWith(ID_PREFIX)) await Notifications.cancelScheduledNotificationAsync(n.identifier).catch(() => {});
  }
  if (!settings.notificationsEnabled || !settings.subscriptionReminders || !(await hasNotificationPermission())) return;
  await ensureChannels();

  const tr = getTranslation();
  const now = new Date();
  const purr = settings.purrNotifications;
  for (const sub of subscriptionsOf(upcoming, settings.subscriptionIds)) {
    const target = setHours(startOfDay(subDays(parseDateKey(sub.date), 1)), REMINDER_HOUR);
    if (target <= now) continue;
    await Notifications.scheduleNotificationAsync({
      identifier: `${ID_PREFIX}${sub.id}`,
      content: {
        title: tr.subscriptions.reminderTitle(sub.comment || tr.subscriptions.title),
        body: tr.subscriptions.reminderBody(`${fmtAmount(sub.amount)} ${currency}`),
        sound: purr ? 'purr.wav' : 'default',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: target,
        channelId: purr ? PURR_CHANNEL : PLAIN_CHANNEL,
      },
    });
  }
}
