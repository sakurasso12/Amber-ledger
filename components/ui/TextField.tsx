import React, { useState } from 'react';
import { Pressable, StyleSheet, TextInput, TextInputProps, TextStyle, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './Text';
import { useTheme } from '@/theme/ThemeProvider';
import { useTranslation } from '@/i18n';
import { controlSurface } from '@/theme/surfaces';
import { designTextStyle } from './Text';

interface TextFieldProps extends TextInputProps {
  label?: string;
}

/** A password field (`secureTextEntry`) gets an eye button that shows or hides what's typed. */
export function TextField({ label, style, secureTextEntry, ...props }: TextFieldProps) {
  const theme = useTheme();
  const tr = useTranslation();
  const [revealed, setRevealed] = useState(false);
  return (
    <View style={styles.wrapper}>
      {label ? <Text style={[styles.label, { color: theme.colors.textMuted }]}>{label}</Text> : null}
      <View>
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
            secureTextEntry ? styles.inputWithEye : null,
            style,
          ]}
          secureTextEntry={secureTextEntry && !revealed}
          {...props}
        />
        {secureTextEntry ? (
          <Pressable
            onPress={() => setRevealed((r) => !r)}
            hitSlop={8}
            style={styles.eye}
            accessibilityRole="button"
            accessibilityLabel={revealed ? tr.auth.hidePassword : tr.auth.showPassword}
          >
            <Ionicons name={revealed ? 'eye-off-outline' : 'eye-outline'} size={20} color={theme.colors.textMuted} />
          </Pressable>
        ) : null}
      </View>
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
  // Room on the right so the text doesn't run under the eye.
  inputWithEye: {
    paddingRight: 44,
  },
  eye: {
    position: 'absolute',
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
});
