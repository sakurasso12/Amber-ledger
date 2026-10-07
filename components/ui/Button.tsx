import React from 'react';
import { StyleProp, StyleSheet, ViewStyle } from 'react-native';
import { PressableScale } from './PressableScale';
import { Text } from './Text';
import { useTheme } from '@/theme/ThemeProvider';
import { controlSurface } from '@/theme/surfaces';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Button({ title, onPress, variant = 'primary', disabled, style }: ButtonProps) {
  const theme = useTheme();

  const backgroundColor =
    variant === 'primary'
      ? theme.colors.primary
      : variant === 'danger'
      ? theme.colors.danger
      : theme.colors.surfaceAlt;
  const textColor = variant === 'secondary' ? theme.colors.text : theme.colors.primaryText;

  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      scaleTo={0.96}
      style={[styles.base, controlSurface(theme), { backgroundColor, opacity: disabled ? 0.5 : 1 }, style]}
    >
      <Text style={[styles.text, { color: textColor }]}>{title}</Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 15,
    fontWeight: '600',
  },
});
