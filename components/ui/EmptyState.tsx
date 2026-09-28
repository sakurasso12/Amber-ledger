import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '@/theme/ThemeProvider';

/** Soft layered-circle backdrop behind the emoji — a lightweight, theme-colored stand-in for a
 * bespoke illustration per empty state. */
function Backdrop({ color }: { color: string }) {
  return (
    <Svg width={96} height={96} viewBox="0 0 96 96" style={StyleSheet.absoluteFill}>
      <Circle cx={48} cy={48} r={48} fill={color} opacity={0.12} />
      <Circle cx={48} cy={48} r={34} fill={color} opacity={0.14} />
    </Svg>
  );
}

export function EmptyState({ icon, title, subtitle }: { icon: string; title: string; subtitle?: string }) {
  const theme = useTheme();
  return (
    <View style={styles.wrapper}>
      <View style={styles.iconWrap}>
        <Backdrop color={theme.colors.accent} />
        <Text style={styles.icon}>{icon}</Text>
      </View>
      <Text style={[styles.title, { color: theme.colors.text }]}>{title}</Text>
      {subtitle ? <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
    gap: 8,
  },
  iconWrap: {
    width: 96,
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  icon: {
    fontSize: 36,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    textAlign: 'center',
  },
});
