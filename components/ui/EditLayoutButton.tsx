import React from 'react';
import { useHelpTarget } from '@/components/mascot/useHelpTarget';
import { Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useTheme } from '@/theme/ThemeProvider';
import { haptics } from '@/lib/haptics';
import { useTranslation } from '@/i18n';

/** The pencil at the top of a screen: turns layout editing on; the check mark turns it off. */
export function EditLayoutButton({ editing, onToggle, disabled = false, helpId }: { editing: boolean; onToggle: () => void; disabled?: boolean; helpId?: string }) {
  const theme = useTheme();
  const helpRef = useHelpTarget(helpId);
  const tr = useTranslation();
  // Simple mode: the layout stays as it is — no pencil.
  const simple = useSettingsStore((s) => s.settings.uiMode === 'simple');
  if (simple && !editing) return null;
  return (
    <Pressable
      ref={helpRef}
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
