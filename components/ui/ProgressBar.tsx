import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';

interface ProgressBarProps {
  /** 0-1+. Values above 1 are clamped for the fill width but still selectable for color via `overColor`. */
  ratio: number;
  color?: string;
  /** Color used once `ratio` passes 1 (e.g. a budget that's been exceeded). Defaults to `color`. */
  overColor?: string;
  height?: number;
}

export function ProgressBar({ ratio, color, overColor, height = 6 }: ProgressBarProps) {
  const theme = useTheme();
  const clamped = Math.max(0, Math.min(1, ratio));
  const fillColor = ratio > 1 ? overColor ?? theme.colors.danger : color ?? theme.colors.primary;

  return (
    <View style={[styles.track, { backgroundColor: theme.colors.surfaceAlt, height, borderRadius: height / 2 }]}>
      <View
        style={[
          styles.fill,
          { width: `${clamped * 100}%`, backgroundColor: fillColor, borderRadius: height / 2 },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { width: '100%', overflow: 'hidden' },
  fill: { height: '100%' },
});
