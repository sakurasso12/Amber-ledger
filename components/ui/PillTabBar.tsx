import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { cardSurface } from '@/theme/surfaces';
import { Text } from './Text';

/** Minimal shape of the props a top-tabs navigator passes to a custom `tabBar`. */
interface TabBarProps {
  state: { index: number; routes: { key: string; name: string }[] };
  descriptors: Record<
    string,
    { options: { title?: string; tabBarIcon?: (p: { focused: boolean; color: string }) => React.ReactNode } }
  >;
  navigation: {
    emit: (e: { type: 'tabPress'; target: string; canPreventDefault: true }) => { defaultPrevented: boolean };
    navigate: (name: string) => void;
  };
}

/** "Vertical" layout navigation: icons only, the active tab expands into a pill with its label. */
export function PillTabBar({ state, descriptors, navigation }: TabBarProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { colors } = theme;

  return (
    <View style={[styles.wrap, { paddingBottom: insets.bottom + 8 }]}>
      <View style={[styles.bar, cardSurface(theme)]}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const { options } = descriptors[route.key];
          const color = focused ? colors.primaryText : colors.textMuted;
          return (
            <Pressable
              key={route.key}
              onPress={() => {
                const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
              }}
              style={[styles.item, focused && { backgroundColor: colors.primary, flexGrow: 2 }]}
            >
              {options.tabBarIcon?.({ focused, color })}
              {focused ? (
                <Text style={[styles.label, { color }]} numberOfLines={1}>
                  {options.title}
                </Text>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 12, paddingTop: 6 },
  bar: { flexDirection: 'row', alignItems: 'center', padding: 6, gap: 4 },
  item: {
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 46,
    borderRadius: 23,
    paddingHorizontal: 10,
  },
  label: { fontSize: 13, fontWeight: '700' },
});
