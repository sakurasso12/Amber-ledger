import React, { useEffect, useState } from 'react';
import { Dimensions, View } from 'react-native';
import Stack, { TransitionPresets } from 'expo-router/js-stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
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
import { useFinanceLockLifecycle } from '@/store/useFinanceLock';
import { Onboarding } from '@/components/onboarding/Onboarding';

/**
 * JS stack (not the native one) because Android's native stack has no swipe-back: here every
 * pushed screen follows the finger when swiped right from its left side and pops on release, like iOS.
 * Editors and lists open as iOS-style sheets that slide up and can be swiped down.
 */
const MODAL = { presentation: 'modal', ...TransitionPresets.ModalPresentationIOS, gestureEnabled: true } as const;

function RootStack() {
  const theme = useTheme();
  useFinanceLockLifecycle();
  return (
    <>
      <StatusBar style={theme.dark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          cardStyle: { backgroundColor: theme.colors.background },
          ...TransitionPresets.SlideFromRightIOS,
          gestureEnabled: true,
          gestureDirection: 'horizontal',
          // Swipe back starts from the left quarter of the screen. Full width stole vertical scrolls:
          // the stack's pan activates after just 5 px sideways, which most scrolls drift by.
          gestureResponseDistance: Math.round(Dimensions.get('window').width * 0.25),
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
        <Stack.Screen name="habit-widget" />
      </Stack>
      <Onboarding />
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
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <AppGate>
          <RootStack />
        </AppGate>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
