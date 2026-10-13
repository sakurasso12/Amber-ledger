import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, type SharedValue } from 'react-native-reanimated';
import { initialWindowMetrics, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { cardSurface } from '@/theme/surfaces';
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
const ACTIVE_GROW = 2.4;
const ICON = 22;
const LABEL_GAP = 6;
/** Same feel as the old spring (theme/motion SPRING: stiffness 250, damping 27). */
const SPRING = { stiffness: 250, damping: 27, mass: 1 };

/** 0 → 1 → 0 as the pill passes over tab i. */
function activeness(position: number, i: number): number {
  'worklet';
  return Math.max(0, 1 - Math.abs(position - i));
}

/** Width of tab i while the pill is at `position`: one unit, growing to ACTIVE_GROW units. */
function tabWidth(position: number, i: number, unit: number): number {
  'worklet';
  return unit * (1 + (ACTIVE_GROW - 1) * activeness(position, i));
}

/**
 * "Vertical" layout navigation: icons only, the active tab expands into a pill with its label.
 *
 * Everything moves on the UI thread (Reanimated), so it stays smooth while the next screen is
 * being drawn during a swipe. Only transforms and opacity animate — no width/flex, which would
 * re-run layout for the whole bar every frame. (The pill itself is the one exception: it's
 * absolutely positioned and has no children, so animating its width costs nothing.)
 */
export function PillTabBar({ state, descriptors, navigation }: TabBarProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  // Keep clear of Android's navigation buttons even if the live inset arrives as 0 (it can inside
  // the tab pager); the window metrics measured at launch are the fallback.
  const bottomInset = Math.max(insets.bottom, initialWindowMetrics?.insets.bottom ?? 0);
  const { colors } = theme;
  const count = state.routes.length;
  const position = useSharedValue(state.index);
  const [barWidth, setBarWidth] = useState(0);

  useEffect(() => {
    position.value = withSpring(state.index, SPRING);
  }, [state.index, position]);

  // One width unit: the inactive tab width. Active = ACTIVE_GROW units; the total stays the same
  // while animating because the extra width only ever moves between neighbouring tabs.
  const unit = barWidth > 0 ? (barWidth - PAD * 2 - GAP * (count - 1)) / (count + ACTIVE_GROW - 1) : 0;

  const pillStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: PAD + position.value * (unit + GAP) }],
  }));

  return (
    <View style={[styles.wrap, { paddingBottom: bottomInset + 8, backgroundColor: colors.background }]}>
      <View style={[styles.bar, cardSurface(theme)]} onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}>
        {unit > 0 ? (
          <>
            <Animated.View
              pointerEvents="none"
              style={[styles.pill, { backgroundColor: colors.primary, width: unit * ACTIVE_GROW }, pillStyle]}
            />
            {state.routes.map((route, index) => (
              <TabFace
                key={route.key}
                index={index}
                position={position}
                unit={unit}
                count={count}
                title={descriptors[route.key].options.title ?? ''}
                icon={descriptors[route.key].options.tabBarIcon}
              />
            ))}
          </>
        ) : null}

        {/* Invisible tap targets on top, sized for the current tab — they only re-lay out once per
            switch, never per animation frame. */}
        <View style={styles.hitRow}>
          {state.routes.map((route, index) => {
            const focused = state.index === index;
            return (
              <Pressable
                key={route.key}
                accessibilityRole="tab"
                accessibilityState={{ selected: focused }}
                accessibilityLabel={descriptors[route.key].options.title}
                style={{ flexGrow: focused ? ACTIVE_GROW : 1, flexBasis: 0, height: ITEM_HEIGHT }}
                onPress={() => {
                  const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                  if (!focused && !event.defaultPrevented) {
                    haptics.tap();
                    navigation.navigate(route.name);
                  }
                }}
              />
            );
          })}
        </View>
      </View>
    </View>
  );
}

/**
 * One tab's icon and label. It's always the active tab's width and slides (translateX) so its
 * centre follows the tab's centre; the label fades in and the icon shifts left to make room.
 */
function TabFace({
  index,
  position,
  unit,
  count,
  title,
  icon,
}: {
  index: number;
  position: SharedValue<number>;
  unit: number;
  count: number;
  title: string;
  icon?: (p: { focused: boolean; color: string }) => React.ReactNode;
}) {
  const { colors } = useTheme();
  const [labelWidth, setLabelWidth] = useState(0);
  const faceWidth = unit * ACTIVE_GROW;
  const shift = (labelWidth + LABEL_GAP) / 2;

  const faceStyle = useAnimatedStyle(() => {
    let left = PAD;
    for (let i = 0; i < index; i++) left += tabWidth(position.value, i, unit) + GAP;
    const centre = left + tabWidth(position.value, index, unit) / 2;
    return { transform: [{ translateX: centre - faceWidth / 2 }] };
  });
  // Icon centred alone when inactive; icon + label centred together when active.
  const rowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shift * (1 - activeness(position.value, index)) }],
  }));
  const onStyle = useAnimatedStyle(() => ({ opacity: activeness(position.value, index) }));
  const offStyle = useAnimatedStyle(() => ({ opacity: 1 - activeness(position.value, index) }));

  return (
    <Animated.View pointerEvents="none" style={[styles.face, { width: faceWidth }, faceStyle]}>
      <Animated.View style={[styles.row, rowStyle]}>
        {/* Muted and highlighted icons cross-fade instead of the colour snapping. */}
        <View style={styles.icon}>
          <Animated.View style={offStyle}>{icon?.({ focused: false, color: colors.textMuted })}</Animated.View>
          <Animated.View style={[StyleSheet.absoluteFill, onStyle]}>{icon?.({ focused: true, color: colors.primaryText })}</Animated.View>
        </View>
        <Animated.View style={[{ marginLeft: LABEL_GAP, maxWidth: faceWidth - ICON - LABEL_GAP - 16 }, onStyle]}>
          <Text
            style={[styles.label, { color: colors.primaryText }]}
            numberOfLines={1}
            onLayout={(e) => setLabelWidth(e.nativeEvent.layout.width)}
          >
            {title}
          </Text>
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 12, paddingTop: 6 },
  bar: { height: ITEM_HEIGHT + PAD * 2, padding: PAD },
  pill: { position: 'absolute', left: 0, top: PAD, height: ITEM_HEIGHT, borderRadius: ITEM_HEIGHT / 2 },
  face: { position: 'absolute', left: 0, top: PAD, height: ITEM_HEIGHT, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center' },
  icon: { width: ICON, height: ICON, alignItems: 'center', justifyContent: 'center' },
  hitRow: { flexDirection: 'row', gap: GAP, height: ITEM_HEIGHT },
  label: { fontSize: 13, fontWeight: '700' },
});
