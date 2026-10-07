import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Text } from './Text';
import { useTheme } from '@/theme/ThemeProvider';
import { controlSurface } from '@/theme/surfaces';

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  color?: string;
}

export function Chip({ label, selected, onPress, color }: ChipProps) {
  const theme = useTheme();
  const activeColor = color ?? theme.colors.primary;

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.base,
        controlSurface(theme),
        theme.design.cardStyle === 'outlined' || theme.design.cardStyle === 'elevated' ? { borderRadius: 100 } : null,
        {
          backgroundColor: selected ? activeColor : theme.colors.surfaceAlt,
          borderColor: selected ? activeColor : theme.colors.border,
        },
      ]}
    >
      <Text style={{ color: selected ? theme.colors.primaryText : theme.colors.text, fontSize: 13, fontWeight: '600' }}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
  },
});
