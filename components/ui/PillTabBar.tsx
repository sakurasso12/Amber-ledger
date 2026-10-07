import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { cardSurface } from '@/theme/surfaces';
import { SPRING } from '@/theme/motion';
import { haptics } from '@/lib/haptics';
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

const PAD = 6;
const GAP = 4;
const ITEM_HEIGHT = 46;
/** The active tab is this many times wider than the others. */
const ACTIVE_GROW = 2;
const LABEL_MAX_WIDTH = 96;

/**
 * "Vertical" layout navigation: icons only, the active tab expands into a pill with its label.
 * Everything is driven by one spring-animated value — the (fractional) active index — so the pill
 * glides from tab to tab while the tabs it passes widen and narrow, instead of jumping.
 */
export function PillTabBar({ state, descriptors, navigation }: TabBarProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { colors } = theme;
  const count = state.routes.length;
  const position = useRef(new Animated.Value(state.index)).current;
  const [barWidth, setBarWidth] = useState(0);

  useEffect(() => {
    // Width/flex can't run on the native driver, so this spring runs in JS — cheap for 5 tabs.
    Animated.spring(position, { toValue: state.index, ...SPRING, useNativeDriver: false }).start();
  }, [state.index, position]);

  // One width unit: the inactive tab width. Active = ACTIVE_GROW units; the total is constant
  // while animating because the extra unit is only ever split between neighbouring tabs.
  const unit = barWidth > 0 ? (barWidth - PAD * 2 - GAP * (count - 1)) / (count + ACTIVE_GROW - 1) : 0;
  const indices = state.routes.map((_, i) => i);
  const pillLeft = position.interpolate({
    inputRange: indices,
    outputRange: indices.map((i) => PAD + i * (unit + GAP)),
    extrapolate: 'clamp',
  });

  /** 0 → 1 → 0 as the pill passes over tab i. */
  const activeness = (i: number) =>
    position.interpolate({ inputRange: [i - 1, i, i + 1], outputRange: [0, 1, 0], extrapolate: 'clamp' });

  return (
    <View style={[styles.wrap, { paddingBottom: insets.bottom + 8 }]}>
      <View style={[styles.bar, cardSurface(theme)]} onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}>
        {unit > 0 ? (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.pill,
              { backgroundColor: colors.primary, width: unit * ACTIVE_GROW, transform: [{ translateX: pillLeft }] },
            ]}
          />
        ) : null}

        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const { options } = descriptors[route.key];
          const active = activeness(index);
          return (
            <Animated.View
              key={route.key}
              style={[styles.slot, { flexGrow: active.interpolate({ inputRange: [0, 1], outputRange: [1, ACTIVE_GROW] }) }]}
            >
              <Pressable
                style={styles.item}
                onPress={() => {
                  const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                  if (!focused && !event.defaultPrevented) {
                    haptics.tap();
                    navigation.navigate(route.name);
                  }
                }}
              >
                {/* Muted and highlighted icons cross-fade instead of the colour snapping. */}
                <View>
                  <Animated.View style={{ opacity: active.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }}>
                    {options.tabBarIcon?.({ focused: false, color: colors.textMuted })}
                  </Animated.View>
                  <Animated.View style={[StyleSheet.absoluteFill, { opacity: active }]}>
                    {options.tabBarIcon?.({ focused: true, color: colors.primaryText })}
                  </Animated.View>
                </View>
                <Animated.View
                  style={{
                    opacity: active,
                    maxWidth: active.interpolate({ inputRange: [0, 1], outputRange: [0, LABEL_MAX_WIDTH] }),
                    marginLeft: active.interpolate({ inputRange: [0, 1], outputRange: [0, 6] }),
                    overflow: 'hidden',
                  }}
                >
                  <Text style={[styles.label, { color: colors.primaryText }]} numberOfLines={1}>
                    {options.title}
                  </Text>
                </Animated.View>
              </Pressable>
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 12, paddingTop: 6 },
  bar: { flexDirection: 'row', alignItems: 'center', padding: PAD, gap: GAP },
  pill: { position: 'absolute', left: 0, top: PAD, height: ITEM_HEIGHT, borderRadius: ITEM_HEIGHT / 2 },
  slot: { flexBasis: 0 },
  item: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: ITEM_HEIGHT,
    paddingHorizontal: 10,
  },
  label: { fontSize: 13, fontWeight: '700' },
});
