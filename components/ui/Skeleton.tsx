import React, { useEffect, useRef } from 'react';
import { Animated, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';

/** A single pulsing placeholder block. */
export function Skeleton({ width, height, borderRadius = 8, style }: { width: number | `${number}%`; height: number; borderRadius?: number; style?: StyleProp<ViewStyle> }) {
  const theme = useTheme();
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View style={[{ width, height, borderRadius, backgroundColor: theme.colors.surfaceAlt, opacity }, style]} />
  );
}

/** Placeholder resembling a row of TaskListItem/ExpenseListItem while the initial data loads. */
export function SkeletonRow() {
  const theme = useTheme();
  return (
    <View style={[styles.row, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      <Skeleton width={22} height={22} borderRadius={11} />
      <View style={styles.body}>
        <Skeleton width="70%" height={14} />
        <Skeleton width="40%" height={11} style={{ marginTop: 6 }} />
      </View>
    </View>
  );
}

/** Full-screen skeleton shown while the app's initial data is loading — a rough approximation of
 * the Tasks screen, so the loading state doesn't feel like a blank flash before content appears. */
export function SkeletonScreen() {
  return (
    <View style={styles.screen}>
      <Skeleton width="45%" height={26} style={styles.header} />
      <Skeleton width="90%" height={32} style={styles.filterBar} />
      {[0, 1, 2, 3, 4].map((i) => (
        <SkeletonRow key={i} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 16, paddingTop: 16, gap: 10 },
  header: { marginBottom: 8 },
  filterBar: { marginBottom: 10 },
  row: { flexDirection: 'row', gap: 12, padding: 12, borderRadius: 14, borderWidth: 1 },
  body: { flex: 1, justifyContent: 'center' },
});
