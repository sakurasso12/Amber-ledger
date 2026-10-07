import React, { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TopTabs } from 'expo-router/js-top-tabs';
import { useTheme } from '@/theme/ThemeProvider';
import { designTextStyle } from '@/components/ui/Text';
import { useTaskStore } from '@/store/useTaskStore';
import { useTranslation } from '@/i18n';
import { Badge } from '@/components/ui';
import { PillTabBar } from '@/components/ui/PillTabBar';
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

  const { design, colors } = theme;
  const labelStyle = { ...styles.label, ...designTextStyle({ fontSize: 11, fontWeight: '700' }, design) };

  // Each design brings its own tab bar: classic strip, floating pill, ink underline, or solid blocks.
  const barByStyle: Record<typeof design.tabBar, object> = {
    classic: {
      backgroundColor: colors.surface,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
      elevation: 0,
      shadowOpacity: 0,
      // Android's edge-to-edge display draws the gesture nav bar over app content by default —
      // without this, its home-indicator pill overlaps the tab icons/labels.
      height: 54 + insets.bottom,
      paddingBottom: insets.bottom,
    },
    floating: {
      backgroundColor: colors.surface,
      marginHorizontal: 16,
      marginBottom: insets.bottom + 10,
      height: 62,
      borderRadius: 31,
      borderTopWidth: 0,
      borderWidth: theme.dark ? 1 : 0,
      borderColor: `${colors.primary}40`,
      elevation: theme.dark ? 0 : 10,
      shadowColor: '#1B2350',
      shadowOpacity: 0.18,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 8 },
      overflow: 'hidden',
    },
    underline: {
      backgroundColor: colors.background,
      borderTopWidth: design.borderWidth,
      borderTopColor: colors.border,
      elevation: 0,
      shadowOpacity: 0,
      height: 50 + insets.bottom,
      paddingBottom: insets.bottom,
    },
    blocks: {
      backgroundColor: colors.surface,
      borderTopWidth: design.borderWidth,
      borderTopColor: colors.border,
      elevation: 0,
      shadowOpacity: 0,
      height: 58 + insets.bottom,
      paddingBottom: insets.bottom,
    },
  };
  const indicatorByStyle: Record<typeof design.tabBar, object> = {
    classic: styles.hiddenIndicator,
    floating: styles.hiddenIndicator,
    underline: { height: 3, top: 0, backgroundColor: colors.text },
    blocks: { height: '100%', backgroundColor: colors.primary },
  };
  // The layout (Settings → App design) can replace the theme's tab bar with its own navigation.
  const layoutBar = theme.layout.tabBar;
  const barStyle = layoutBar === 'floating' ? 'floating' : design.tabBar;
  const blocks = barStyle === 'blocks' && !layoutBar;
  const onTop = layoutBar === 'top';

  return (
    <TopTabs
      tabBarPosition={onTop ? 'top' : 'bottom'}
      style={{ backgroundColor: colors.background }}
      tabBar={layoutBar === 'pill' ? (props: object) => <PillTabBar {...(props as React.ComponentProps<typeof PillTabBar>)} /> : undefined}
      screenOptions={
        onTop
          ? {
              swipeEnabled: true,
              tabBarScrollEnabled: true,
              tabBarShowIcon: false,
              tabBarShowLabel: true,
              tabBarActiveTintColor: colors.text,
              tabBarInactiveTintColor: colors.textMuted,
              tabBarIndicatorStyle: { height: 4, borderRadius: 2, backgroundColor: colors.primary },
              tabBarLabelStyle: { ...labelStyle, ...designTextStyle({ fontSize: 15, fontWeight: '800' }, design), textTransform: 'none' },
              tabBarItemStyle: styles.topItem,
              tabBarStyle: {
                backgroundColor: colors.background,
                paddingTop: insets.top,
                elevation: 0,
                shadowOpacity: 0,
                borderBottomWidth: StyleSheet.hairlineWidth,
                borderBottomColor: colors.border,
              },
            }
          : {
              swipeEnabled: true,
              tabBarShowIcon: barStyle !== 'underline',
              tabBarShowLabel: barStyle !== 'floating',
              tabBarActiveTintColor: blocks ? colors.primaryText : barStyle === 'underline' ? colors.text : colors.primary,
              tabBarInactiveTintColor: colors.textMuted,
              tabBarIndicatorStyle: indicatorByStyle[barStyle],
              tabBarLabelStyle: labelStyle,
              tabBarItemStyle: barStyle === 'floating' ? styles.floatingItem : styles.item,
              tabBarStyle: barByStyle[barStyle],
            }
      }
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
  floatingItem: { justifyContent: 'center' },
  topItem: { width: 'auto', paddingHorizontal: 14, minHeight: 46 },
});
