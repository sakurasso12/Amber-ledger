import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';
import { SkeletonScreen } from '@/components/ui';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useTaskStore } from '@/store/useTaskStore';
import { useFinanceStore } from '@/store/useFinanceStore';
import {
  ensureNotificationPermission,
  hasNotificationPermission,
  listenForSnoozeActions,
  registerNotificationCategories,
  setupNotifications,
} from '@/notifications';
import { useTranslation } from '@/i18n';
import { refreshHomeWidget } from '@/lib/widgetRefresh';

/** Editors and lists open as sheets sliding up from the bottom, like iOS modals. */
const MODAL = { presentation: 'modal', animation: 'slide_from_bottom' } as const;

function RootStack() {
  const theme = useTheme();
  return (
    <>
      <StatusBar style={theme.dark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.colors.background },
          // iOS-style push (parallax slide) for settings sub-screens on Android too.
          animation: 'ios_from_right',
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="task/new" options={MODAL} />
        <Stack.Screen name="task/[id]" options={MODAL} />
        <Stack.Screen name="expense/new" options={MODAL} />
        <Stack.Screen name="expense/[id]" options={MODAL} />
        <Stack.Screen name="expense/planned" options={MODAL} />
        <Stack.Screen name="expense/recurring" options={MODAL} />
        <Stack.Screen name="category/manage" options={MODAL} />
      </Stack>
    </>
  );
}

function AppGate({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  const tr = useTranslation();
  const hasHydrated = useSettingsStore((s) => s.hasHydrated);
  const notificationsEnabled = useSettingsStore((s) => s.settings.notificationsEnabled);
  const updateSettings = useSettingsStore((s) => s.updateSettings);
  const loadTasks = useTaskStore((s) => s.load);
  const loadFinance = useFinanceStore((s) => s.load);
  const syncRecurringExpenses = useFinanceStore((s) => s.syncRecurringExpenses);
  const resyncAllReminders = useTaskStore((s) => s.resyncAllReminders);
  const [dataLoaded, setDataLoaded] = useState(false);

  useEffect(() => {
    setupNotifications();
    registerNotificationCategories({
      snooze10: tr.notificationsContent.snooze10,
      snooze30: tr.notificationsContent.snooze30,
      snooze60: tr.notificationsContent.snooze60,
    });
    const subscription = listenForSnoozeActions();

    Promise.all([loadTasks(), loadFinance()]).then(async () => {
      setDataLoaded(true);
      await syncRecurringExpenses();

      // The OS permission is the real source of truth — request it up front so scheduled
      // reminders actually fire, then re-schedule anything that was silently skipped before.
      if (notificationsEnabled && !(await hasNotificationPermission())) {
        const granted = await ensureNotificationPermission();
        updateSettings({ notificationsEnabled: granted });
      }
      resyncAllReminders();
    });

    return () => subscription.remove();
  }, []);

  // Keep the home screen widgets in step with the data instead of waiting for their 30-min refresh.
  useEffect(() => {
    if (!dataLoaded) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const schedule = () => {
      clearTimeout(timer);
      timer = setTimeout(() => refreshHomeWidget(), 1500);
    };
    const unsubscribeTasks = useTaskStore.subscribe((state, prev) => {
      if (state.tasks !== prev.tasks) schedule();
    });
    const unsubscribeFinance = useFinanceStore.subscribe((state, prev) => {
      if (state.expenses !== prev.expenses || state.workDays !== prev.workDays) schedule();
    });
    return () => {
      clearTimeout(timer);
      unsubscribeTasks();
      unsubscribeFinance();
    };
  }, [dataLoaded]);

  if (!hasHydrated || !dataLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <SkeletonScreen />
      </View>
    );
  }

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AppGate>
        <RootStack />
      </AppGate>
    </ThemeProvider>
  );
}
