import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/Text';
import { useKeyboardHeight } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';

interface MoneyDialogProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  hint?: string;
  children: React.ReactNode;
}

/** The small centred dialog Finance uses for typing amounts in (lifted above the keyboard). */
export function MoneyDialog({ visible, onClose, title, hint, children }: MoneyDialogProps) {
  const theme = useTheme();
  const keyboardHeight = useKeyboardHeight();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={[styles.backdrop, { paddingBottom: keyboardHeight }]} onPress={onClose}>
        <Pressable
          style={[styles.dialog, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
          onPress={(e) => e.stopPropagation()}
        >
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <Text style={[styles.title, { color: theme.colors.text }]}>{title}</Text>
            {hint ? <Text style={[styles.hint, { color: theme.colors.textMuted }]}>{hint}</Text> : null}
            {children}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  dialog: { width: '100%', maxWidth: 340, maxHeight: '85%', borderRadius: 18, borderWidth: 1 },
  content: { padding: 18, gap: 12 },
  title: { fontSize: 16, fontWeight: '700' },
  hint: { fontSize: 12, lineHeight: 17, marginTop: -6 },
});
