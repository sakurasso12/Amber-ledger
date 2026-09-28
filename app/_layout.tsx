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

function RootStack() {
  const theme = useTheme();
  return (
    <>
      <StatusBar style={theme.dark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="task/new" options={{ presentation: 'modal' }} />
        <Stack.Screen name="task/[id]" options={{ presentation: 'modal' }} />
        <Stack.Screen name="expense/new" options={{ presentation: 'modal' }} />
        <Stack.Screen name="expense/[id]" options={{ presentation: 'modal' }} />
        <Stack.Screen name="expense/planned" options={{ presentation: 'modal' }} />
        <Stack.Screen name="expense/recurring" options={{ presentation: 'modal' }} />
        <Stack.Screen name="category/manage" options={{ presentation: 'modal' }} />
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
