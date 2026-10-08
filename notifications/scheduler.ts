import type * as NotificationTypes from 'expo-notifications';
import { Notifications } from './expoNotifications';
import { Task } from '@/types';
import { getTranslation } from '@/i18n';
import { nextOccurrence } from '@/lib/recurrence';
import { hasNotificationPermission } from './permissions';
import { TASK_REMINDER_CATEGORY } from './actions';

/** Expo's native DAILY/WEEKLY/MONTHLY triggers only repeat every single unit — there's no way to
 * express "every 3 days" natively. For those, pre-schedule this many upcoming one-shot
 * occurrences instead (computed with the same rule math used to advance a completed task's next
 * instance); `resyncAllReminders` re-tops the batch on every app launch, so as long as the app
 * gets opened more often than this many occurrences take to elapse, it never runs dry. Kept small
 * because iOS caps an app at 64 pending local notifications in total, shared across all tasks. */
const MAX_FALLBACK_OCCURRENCES = 12;

/** Recurring reminders can expand into more than one scheduled notification (e.g. one per
 * selected weekday), so cancellation can't rely on a single fixed identifier — it looks up
 * everything tagged with this task's id instead. */
export async function cancelTaskReminder(taskId: string): Promise<void> {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const mine = scheduled.filter((n) => n.content.data?.taskId === taskId);
    await Promise.all(mine.map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier).catch(() => {})));
  } catch {
    // Fall back to the old single-id cancel in case the id was scheduled before this change.
    await Notifications.cancelScheduledNotificationAsync(taskId).catch(() => {});
  }
}

/** JS Date.getDay() (0=Sun..6=Sat) to expo-notifications' weekday convention (1=Sun..7=Sat). */
function toExpoWeekday(jsDay: number): number {
  return jsDay + 1;
}

async function scheduleOne(
  identifier: string,
  taskId: string,
  title: string,
  body: string,
  trigger: NotificationTypes.NotificationTriggerInput
): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    identifier,
    content: { title, body, data: { taskId }, categoryIdentifier: TASK_REMINDER_CATEGORY },
    trigger,
  });
}

/** Builds the repeating OS-level trigger(s) for a recurring task's reminder, keyed off the
 * time-of-day (and, for weekly, the weekday) of its reminder time — the calendar date carried on
 * `deadlineAt` is otherwise irrelevant once a task repeats. Only handles `interval === 1` (repeat
 * every day/week/month), which is what expo's native DAILY/WEEKLY/MONTHLY triggers can express;
 * callers must use `scheduleFallbackOccurrences` for larger intervals. */
function buildRecurringTriggers(task: Task, reminderAt: Date): NotificationTypes.SchedulableNotificationTriggerInput[] {
  const rule = task.recurrenceRule!;
  const hour = reminderAt.getHours();
  const minute = reminderAt.getMinutes();

  if (rule.freq === 'daily') {
    return [{ type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute }];
  }

  if (rule.freq === 'weekly') {
    const weekdays = rule.weekdays && rule.weekdays.length > 0 ? rule.weekdays : [reminderAt.getDay()];
    return weekdays.map((jsDay) => ({
      type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
      weekday: toExpoWeekday(jsDay),
      hour,
      minute,
    }));
  }

  // monthly
  return [{ type: Notifications.SchedulableTriggerInputTypes.MONTHLY, day: reminderAt.getDate(), hour, minute }];
}

/** Pre-schedules the next `MAX_FALLBACK_OCCURRENCES` occurrences as individual one-shot
 * reminders, walking the rule forward with the same `nextOccurrence` math used to materialize a
 * completed task's next instance. Past occurrences (e.g. a stale `deadlineAt` from a task that
 * sat untouched) are skipped without consuming a batch slot. */
async function scheduleFallbackOccurrences(task: Task, minutesBefore: number, title: string, body: string): Promise<void> {
  const rule = task.recurrenceRule!;
  let deadline: string | null = task.deadlineAt;
  let scheduledCount = 0;
  let safety = 0;

  while (deadline && scheduledCount < MAX_FALLBACK_OCCURRENCES && safety < 200) {
    safety++;
    const fireAt = new Date(deadline).getTime() - minutesBefore * 60_000;
    if (fireAt > Date.now()) {
      try {
        await scheduleOne(`${task.id}:${scheduledCount}`, task.id, title, body, {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: fireAt,
        });
      } catch (error) {
        console.error('[reminder] fallback occurrence scheduling failed:', error);
      }
      scheduledCount++;
    }
    deadline = nextOccurrence(rule, deadline);
  }
}

export async function scheduleTaskReminder(task: Task, minutesBefore: number): Promise<void> {
  if (!task.deadlineAt) return;

  const tr = getTranslation().notificationsContent;
  const body = minutesBefore > 0 ? tr.deadlineIn(minutesBefore) : tr.deadlineNow;
  const title = task.isImportant ? `⭐ ${task.title}` : task.title;

  if (task.recurrenceRule) {
    if (task.recurrenceRule.interval === 1) {
      const reminderAt = new Date(new Date(task.deadlineAt).getTime() - minutesBefore * 60_000);
      const triggers = buildRecurringTriggers(task, reminderAt);
      try {
        await Promise.all(triggers.map((trigger, index) => scheduleOne(`${task.id}:${index}`, task.id, title, body, trigger)));
      } catch (error) {
        console.error('[reminder] recurring scheduling failed:', error);
      }
    } else {
      await scheduleFallbackOccurrences(task, minutesBefore, title, body);
    }
    return;
  }

  const fireAt = new Date(task.deadlineAt).getTime() - minutesBefore * 60_000;
  if (fireAt <= Date.now()) {
    console.warn(`[reminder] "${task.title}" deadline is within ${minutesBefore} min (or past) — skipped`);
    return;
  }

  try {
    await scheduleOne(task.id, task.id, title, body, { type: Notifications.SchedulableTriggerInputTypes.DATE, date: fireAt });
  } catch (error) {
    // On Android 12+, exact-alarm scheduling can be refused until the user grants the
    // "Alarms & reminders" special permission (system settings, not a runtime dialog). Fall back
    // to a non-exact trigger so the reminder still fires, just not necessarily to the second.
    console.warn('[reminder] exact scheduling failed, falling back to inexact trigger:', error);
    try {
      await scheduleOne(task.id, task.id, title, body, {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: Math.max(1, Math.round((fireAt - Date.now()) / 1000)),
      });
    } catch (fallbackError) {
      console.error('[reminder] fallback scheduling also failed:', fallbackError);
    }
  }
}

/** Cancels any existing reminder for the task, then reschedules if it still needs one — call this
 * after every create/update/delete/complete so the notification always matches current state. */
export async function syncTaskReminder(task: Task, minutesBefore: number): Promise<void> {
  await cancelTaskReminder(task.id);

  if (task.status === 'done' || !task.deadlineAt) return;
  if (!(await hasNotificationPermission())) return;

  await scheduleTaskReminder(task, minutesBefore);
}
