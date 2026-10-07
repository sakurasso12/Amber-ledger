import React from 'react';
import { StyleSheet, TextInput, TextInputProps, TextStyle, View } from 'react-native';
import { Text } from './Text';
import { useTheme } from '@/theme/ThemeProvider';
import { controlSurface } from '@/theme/surfaces';
import { designTextStyle } from './Text';

interface TextFieldProps extends TextInputProps {
  label?: string;
}

export function TextField({ label, style, ...props }: TextFieldProps) {
  const theme = useTheme();
  return (
    <View style={styles.wrapper}>
      {label ? <Text style={[styles.label, { color: theme.colors.textMuted }]}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={theme.colors.textMuted}
        style={[
          styles.input,
          controlSurface(theme) as TextStyle,
          designTextStyle({ fontSize: 15 }, theme.design),
          {
            backgroundColor: theme.colors.surfaceAlt,
            borderColor: theme.colors.border,
            color: theme.colors.text,
          },
          style,
        ]}
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
  },
});
