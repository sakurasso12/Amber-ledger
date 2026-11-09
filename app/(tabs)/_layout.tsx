import React, { useMemo } from 'react';
import { StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TopTabs } from 'expo-router/js-top-tabs';
import { useTheme } from '@/theme/ThemeProvider';
import { designTextStyle } from '@/components/ui/Text';
import { useTaskStore } from '@/store/useTaskStore';
import { useTranslation } from '@/i18n';
import { Badge } from '@/components/ui';
import { PillTabBar } from '@/components/ui/PillTabBar';
import { BackdropHost } from '@/components/ui/Screen';
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
  // Tab labels stay as written: the design's UPPERCASE small labels made "CALENDAR" / "SETTINGS" too
  // wide for a fifth of the screen, so they wrapped and got cut off at the bottom.
  const labelStyle = { ...styles.label, ...designTextStyle({ fontSize: 11, fontWeight: '700' }, design), textTransform: 'none' as const, letterSpacing: 0 };

  // Settings → Тема → Розташування: menu shape and whether it has a plate under it. Without the plate
  // the icons sit straight on the screen's background / gradient — no strip, no hairline.
  const plate = theme.layout.menuPlate;
  const barByStyle: Record<'classic' | 'floating' | 'underline', object> = {
    classic: {
      backgroundColor: plate ? colors.surface : 'transparent',
      borderTopWidth: 0,
      elevation: 0,
      shadowOpacity: 0,
      // Android's edge-to-edge display draws the gesture nav bar over app content by default —
      // without this, its home-indicator pill overlaps the tab icons/labels.
      height: 54 + insets.bottom,
      paddingBottom: insets.bottom,
      // Landscape: the navigation buttons / camera cut-out sit on a side.
      paddingLeft: insets.left,
      paddingRight: insets.right,
    },
    floating: {
      backgroundColor: plate ? colors.surface : 'transparent',
      marginLeft: 16 + insets.left,
      marginRight: 16 + insets.right,
      marginBottom: insets.bottom + 10,
      height: 62,
      borderRadius: 31,
      borderTopWidth: 0,
      borderWidth: plate && theme.dark ? 1 : 0,
      borderColor: `${colors.primary}40`,
      elevation: plate && !theme.dark ? 10 : 0,
      shadowOpacity: plate ? 0.18 : 0,
      shadowColor: '#1B2350',
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 8 },
      overflow: 'hidden',
    },
    underline: {
      backgroundColor: plate ? colors.background : 'transparent',
      borderTopWidth: 0,
      elevation: 0,
      shadowOpacity: 0,
      height: 50 + insets.bottom,
      paddingBottom: insets.bottom,
      paddingLeft: insets.left,
      paddingRight: insets.right,
    },
  };
  const indicatorByStyle: Record<'classic' | 'floating' | 'underline', object> = {
    classic: styles.hiddenIndicator,
    floating: styles.hiddenIndicator,
    underline: { height: 3, top: 0, backgroundColor: colors.text },
  };
  // The layout (Settings → App design) can replace the theme's tab bar with its own navigation.
  const layoutBar = theme.layout.tabBar;
  const menu = theme.layout.menu;
  const barStyle: 'classic' | 'floating' | 'underline' = menu === 'bubble' || menu === 'pill' ? 'floating' : menu;

  return (
    // One background behind the screens AND the tab bar (gradient / photo); both are see-through.
    <BackdropHost>
    <TopTabs
      tabBarPosition="bottom"
      style={{ backgroundColor: 'transparent' }}
      tabBar={layoutBar === 'pill' ? (props: object) => <PillTabBar {...(props as React.ComponentProps<typeof PillTabBar>)} /> : undefined}
      screenOptions={{
        swipeEnabled: true,
        tabBarShowIcon: barStyle !== 'underline',
        tabBarShowLabel: barStyle !== 'floating',
        tabBarActiveTintColor: barStyle === 'underline' ? colors.text : colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarIndicatorStyle: indicatorByStyle[barStyle],
        tabBarLabelStyle: labelStyle,
        // One line, shrunk to fit: long Ukrainian/Russian labels ("Налаштування") used to wrap and get cut.
        tabBarLabel: ({ color, children }: { color: string; children: string }) => (
          <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={[labelStyle, { color }]}>
            {children}
          </Text>
        ),
        tabBarItemStyle: barStyle === 'floating' ? styles.floatingItem : styles.item,
        tabBarStyle: barByStyle[barStyle],
        sceneStyle: { backgroundColor: 'transparent' },
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
    </BackdropHost>
  );
}

const styles = StyleSheet.create({
  hiddenIndicator: { height: 0 },
  label: { fontSize: 11, textTransform: 'none', marginTop: 0 },
  item: { paddingTop: 6 },
  // The floating bar is 62 high; the tab item's own padding (10) and min height (48) pushed the icons up.
  floatingItem: { justifyContent: 'center', alignItems: 'center', height: 62, minHeight: 62, paddingVertical: 0 },
});
