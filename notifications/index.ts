import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

let isSetup = false;

/** Configures the notification handler once at app startup. Permission is requested separately,
 * with an explanatory screen, the first time the user touches a feature that needs it. */
export function setupNotifications() {
  if (isSetup) return;
  isSetup = true;
}

export { ensureNotificationPermission, hasNotificationPermission } from './permissions';
export { cancelTaskReminder, scheduleTaskReminder, syncTaskReminder } from './scheduler';
export { checkBudgetAlerts } from './budgetAlerts';
export { clearStickyNotification, syncStickyNotification } from './sticky';
export { registerNotificationCategories, listenForSnoozeActions, TASK_REMINDER_CATEGORY } from './actions';
