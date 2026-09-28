import { Task } from '@/types';
import { getTranslation } from '@/i18n';

/**
 * "Important" tasks get an ongoing/sticky Android notification that can't be swiped away —
 * expo-notifications has no `ongoing` flag, so this goes through @notifee/react-native instead.
 * Notifee is a native module: it works in a dev client or a full EAS build, but throws in plain
 * Expo Go. Every call is wrapped so the rest of the app keeps working there regardless.
 */

let channelReady: Promise<string> | null = null;

async function ensureChannel(): Promise<string> {
  if (!channelReady) {
    channelReady = (async () => {
      const notifee = (await import('@notifee/react-native')).default;
      return notifee.createChannel({
        id: 'important-tasks',
        name: getTranslation().notificationsContent.importantTask,
        importance: 4, // AndroidImportance.HIGH
      });
    })();
  }
  return channelReady;
}

export async function syncStickyNotification(task: Task): Promise<void> {
  try {
    const notifee = (await import('@notifee/react-native')).default;
    const channelId = await ensureChannel();
    const tr = getTranslation();

    if (!task.isImportant || task.status === 'done') {
      await notifee.cancelNotification(task.id);
      return;
    }

    await notifee.displayNotification({
      id: task.id,
      title: `⭐ ${task.title}`,
      body: task.deadlineAt
        ? `${tr.notificationsContent.deadlinePrefix} ${new Date(task.deadlineAt).toLocaleString(tr.localeCode)}`
        : tr.notificationsContent.importantTask,
      android: {
        channelId,
        ongoing: true,
        autoCancel: false,
        importance: 4,
        smallIcon: 'ic_launcher',
      },
    });
  } catch (error) {
    console.warn('Sticky notifications need a dev client build (notifee is a native module):', error);
  }
}

export async function clearStickyNotification(taskId: string): Promise<void> {
  try {
    const notifee = (await import('@notifee/react-native')).default;
    await notifee.cancelNotification(taskId);
  } catch {
    // Notifee unavailable (Expo Go) — nothing to clear.
  }
}
