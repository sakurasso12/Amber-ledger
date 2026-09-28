import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleProp, StyleSheet, TextInput, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { haptics } from '@/lib/haptics';

interface QuickAddBarProps {
  placeholder: string;
  keyboardType?: 'default' | 'decimal-pad';
  onSubmit: (value: string) => void;
  onClose: () => void;
  style?: StyleProp<ViewStyle>;
}

/** Inline single-field capture row — revealed by long-pressing a screen's FAB for a faster path
 * than opening the full editor. Submitting keeps focus so multiple items can be added in a row;
 * closing (✕ or blur) dismisses it. */
export function QuickAddBar({ placeholder, keyboardType = 'default', onSubmit, onClose, style }: QuickAddBarProps) {
  const theme = useTheme();
  const [value, setValue] = useState('');
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(timer);
  }, []);

  function submit() {
    const trimmed = value.trim();
    if (!trimmed) return;
    haptics.success();
    onSubmit(trimmed);
    setValue('');
    inputRef.current?.focus();
  }

  return (
    <View style={[styles.wrapper, { backgroundColor: theme.colors.surface, borderColor: theme.colors.primary }, style]}>
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={setValue}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textMuted}
        keyboardType={keyboardType}
        returnKeyType="done"
        onSubmitEditing={submit}
        style={[styles.input, { color: theme.colors.text }]}
      />
      <Pressable onPress={submit} hitSlop={8} style={styles.button}>
        <Ionicons name="checkmark-circle" size={26} color={theme.colors.success} />
      </Pressable>
      <Pressable onPress={onClose} hitSlop={8} style={styles.button}>
        <Ionicons name="close-circle" size={26} color={theme.colors.textMuted} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  input: { flex: 1, fontSize: 15, paddingVertical: 4 },
  button: { padding: 2 },
});
