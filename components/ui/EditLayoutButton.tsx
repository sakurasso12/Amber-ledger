import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { haptics } from '@/lib/haptics';
import { useTranslation } from '@/i18n';

/** The pencil at the top of a screen: turns layout editing on; the check mark turns it off. */
export function EditLayoutButton({ editing, onToggle, disabled = false }: { editing: boolean; onToggle: () => void; disabled?: boolean }) {
  const theme = useTheme();
  const tr = useTranslation();
  return (
    <Pressable
      disabled={disabled}
      onPress={() => {
        haptics.tap();
        onToggle();
      }}
      hitSlop={10}
      accessibilityLabel={editing ? tr.layoutEdit.done : tr.layoutEdit.edit}
      style={[
        styles.button,
        { backgroundColor: editing ? theme.colors.primary : `${theme.colors.primary}1F` },
        disabled && { opacity: 0.35 },
      ]}
    >
      <Ionicons name={editing ? 'checkmark' : 'pencil'} size={18} color={editing ? theme.colors.primaryText : theme.colors.primary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
});
