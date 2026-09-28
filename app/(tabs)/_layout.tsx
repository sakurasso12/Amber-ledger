import React, { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TopTabs } from 'expo-router/js-top-tabs';
import { useTheme } from '@/theme/ThemeProvider';
import { useTaskStore } from '@/store/useTaskStore';
import { useTranslation } from '@/i18n';
import { Badge } from '@/components/ui';
import { todayKey, toDateKey } from '@/lib/dateRanges';

/** As of Expo Router's SDK 56 navigation rewrite, importing `@react-navigation/*` packages
 * directly is no longer supported — `expo-router/js-top-tabs` is the first-party replacement for
 * `@react-navigation/material-top-tabs` (same runtime API, paged by react-native-tab-view /
 * react-native-pager-view under the hood). `tabBarPosition: "bottom"` keeps the familiar bottom
 * tab bar look — only the swipe behavior, driven by the pager underneath, is new. */

type IconName = keyof typeof Ionicons.glyphMap;

function TabIcon({ focused, color, name, outlineName }: { focused: boolean; color: string; name: IconName; outlineName: IconName }) {
  return <Ionicons name={focused ? name : outlineName} size={22} color={color} />;
}

export default function TabsLayout() {
  const theme = useTheme();
  const t = useTranslation();
  const insets = useSafeAreaInsets();
  const tasks = useTaskStore((s) => s.tasks);

  const dueCount = useMemo(() => {
    const today = todayKey();
    return tasks.filter((task) => {
      if (task.status === 'done' || !task.deadlineAt) return false;
      const deadlineKey = toDateKey(new Date(task.deadlineAt));
      return deadlineKey <= today;
    }).length;
  }, [tasks]);

  return (
    <TopTabs
      tabBarPosition="bottom"
      screenOptions={{
        swipeEnabled: true,
        tabBarShowIcon: true,
        tabBarShowLabel: true,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarIndicatorStyle: styles.hiddenIndicator,
        tabBarLabelStyle: styles.label,
        tabBarItemStyle: styles.item,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: theme.colors.border,
          elevation: 0,
          shadowOpacity: 0,
          // Android's edge-to-edge display draws the gesture nav bar over app content by default —
          // without this, its home-indicator pill overlaps the tab icons/labels.
          height: 54 + insets.bottom,
          paddingBottom: insets.bottom,
        },
      }}
    >
      <TopTabs.Screen
        name="index"
        options={{
          title: t.tabs.tasks,
          tabBarIcon: ({ focused, color }: { focused: boolean; color: string }) => (
            <TabIcon focused={focused} color={color} name="list" outlineName="list-outline" />
          ),
          tabBarBadge: dueCount > 0 ? () => <Badge count={dueCount} /> : undefined,
        }}
      />
      <TopTabs.Screen
        name="calendar"
        options={{
          title: t.tabs.calendar,
          tabBarIcon: ({ focused, color }: { focused: boolean; color: string }) => (
            <TabIcon focused={focused} color={color} name="calendar" outlineName="calendar-outline" />
          ),
        }}
      />
      <TopTabs.Screen
        name="finance"
        options={{
          title: t.tabs.finance,
          tabBarIcon: ({ focused, color }: { focused: boolean; color: string }) => (
            <TabIcon focused={focused} color={color} name="wallet" outlineName="wallet-outline" />
          ),
        }}
      />
      <TopTabs.Screen
        name="stats"
        options={{
          title: t.tabs.stats,
          tabBarIcon: ({ focused, color }: { focused: boolean; color: string }) => (
            <TabIcon focused={focused} color={color} name="stats-chart" outlineName="stats-chart-outline" />
          ),
        }}
      />
      <TopTabs.Screen
        name="settings"
        options={{
          title: t.tabs.settings,
          tabBarIcon: ({ focused, color }: { focused: boolean; color: string }) => (
            <TabIcon focused={focused} color={color} name="settings" outlineName="settings-outline" />
          ),
        }}
      />
    </TopTabs>
  );
}

const styles = StyleSheet.create({
  hiddenIndicator: { height: 0 },
  label: { fontSize: 11, textTransform: 'none', marginTop: 0 },
  item: { paddingTop: 6 },
});
