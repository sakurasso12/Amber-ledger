import type * as NotificationTypes from 'expo-notifications';
import { Notifications } from './expoNotifications';

export const TASK_REMINDER_CATEGORY = 'task-reminder';

const SNOOZE_MINUTES: Record<string, number> = {
  'snooze-10': 10,
  'snooze-30': 30,
  'snooze-60': 60,
};

/** Registers the "snooze 10/30/60 min" action buttons shown on task reminder notifications.
 * Safe to call every app launch — it just re-registers the same category. */
export async function registerNotificationCategories(labels: {
  snooze10: string;
  snooze30: string;
  snooze60: string;
}): Promise<void> {
  await Notifications.setNotificationCategoryAsync(TASK_REMINDER_CATEGORY, [
    { identifier: 'snooze-10', buttonTitle: labels.snooze10 },
    { identifier: 'snooze-30', buttonTitle: labels.snooze30 },
    { identifier: 'snooze-60', buttonTitle: labels.snooze60 },
  ]);
}

/** Listens for a snooze action tap and reschedules the same notification content that many
 * minutes later — reuses whatever title/body/taskId the original notification carried, so it
 * doesn't need to look the task back up in the store. Call once at app startup. */
export function listenForSnoozeActions(): NotificationTypes.EventSubscription {
  return Notifications.addNotificationResponseReceivedListener(async (response) => {
    const minutes = SNOOZE_MINUTES[response.actionIdentifier];
    if (!minutes) return;

    const { title, body, data } = response.notification.request.content;
    const taskId = (data as { taskId?: string } | null)?.taskId;
    if (!taskId) return;

    await Notifications.scheduleNotificationAsync({
      identifier: `${taskId}:snooze:${Date.now()}`,
      content: {
        title: title ?? '',
        body: body ?? '',
        data: { taskId },
        categoryIdentifier: TASK_REMINDER_CATEGORY,
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: minutes * 60 },
    });
  });
}
