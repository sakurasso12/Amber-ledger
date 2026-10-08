import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import type * as Impl from './impl';

/**
 * Notifications facade. Since SDK 53 Expo Go on Android throws as soon as `expo-notifications` is
 * imported, which took the whole app down with it. Outside Expo Go this simply forwards to
 * ./impl; inside Expo Go on Android the module is never loaded and every call is a harmless no-op,
 * so the rest of the app can still be tried there (widgets and notifee are skipped the same way).
 */
const notificationsUnavailable =
  Platform.OS === 'android' && Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

const noop = async () => {};

const stub: typeof Impl = {
  setupNotifications: () => {},
  ensureNotificationPermission: async () => false,
  hasNotificationPermission: async () => false,
  cancelTaskReminder: noop,
  scheduleTaskReminder: noop,
  syncTaskReminder: noop,
  checkBudgetAlerts: noop,
  syncSalaryReminder: noop,
  clearStickyNotification: noop,
  syncStickyNotification: noop,
  registerNotificationCategories: noop,
  listenForSnoozeActions: () => ({ remove: () => {} }) as ReturnType<typeof Impl.listenForSnoozeActions>,
  TASK_REMINDER_CATEGORY: 'task-reminder',
};

const impl: typeof Impl = notificationsUnavailable ? stub : require('./impl');

export const {
  setupNotifications,
  ensureNotificationPermission,
  hasNotificationPermission,
  cancelTaskReminder,
  scheduleTaskReminder,
  syncTaskReminder,
  checkBudgetAlerts,
  syncSalaryReminder,
  clearStickyNotification,
  syncStickyNotification,
  registerNotificationCategories,
  listenForSnoozeActions,
  TASK_REMINDER_CATEGORY,
} = impl;
