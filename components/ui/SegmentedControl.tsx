import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from './Text';
import { useTheme } from '@/theme/ThemeProvider';
import { controlSurface } from '@/theme/surfaces';

interface Segment<T extends string> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  segments: Segment<T>[];
  value: T;
  onChange: (value: T) => void;
}

export function SegmentedControl<T extends string>({ segments, value, onChange }: SegmentedControlProps<T>) {
  const theme = useTheme();

  return (
    <View style={[styles.wrapper, { backgroundColor: theme.colors.surfaceAlt, borderColor: theme.colors.border }, controlSurface(theme)]}>
      {segments.map((segment) => {
        const isActive = segment.value === value;
        return (
          <Pressable
            key={segment.value}
            onPress={() => onChange(segment.value)}
            style={[styles.segment, { borderRadius: Math.max(0, theme.design.radius.control - 3) }, isActive && { backgroundColor: theme.colors.primary }]}
          >
            <Text
              style={[
                styles.label,
                { color: isActive ? theme.colors.primaryText : theme.colors.textMuted },
              ]}
            >
              {segment.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    padding: 3,
    gap: 3,
  },
  segment: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 9,
    alignItems: 'center',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
  },
});
