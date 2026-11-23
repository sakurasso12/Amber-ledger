import React, { useEffect, useState } from 'react';
import { Alert, AlertButton, Modal, Pressable, StyleSheet, View } from 'react-native';
import { Text } from './Text';
import { useTheme } from '@/theme/ThemeProvider';

/**
 * Web / desktop (2.0): react-native-web's Alert.alert does nothing, so confirmations ("Delete?"),
 * validation messages and choices silently vanished. Here Alert.alert is replaced with an in-app
 * dialog in the app's theme; every existing call keeps working unchanged. Esc = the cancel button.
 */
interface Pending {
  title: string;
  message?: string;
  buttons: AlertButton[];
}

let push: ((p: Pending) => void) | null = null;
const queue: Pending[] = [];

Alert.alert = (title, message, buttons) => {
  const item = { title, message, buttons: buttons && buttons.length ? buttons : [{ text: 'OK' }] };
  if (push) push(item);
  else queue.push(item);
};

export function AlertHost() {
  const theme = useTheme();
  const [items, setItems] = useState<Pending[]>([]);
  const current = items[0];

  useEffect(() => {
    push = (p) => setItems((list) => [...list, p]);
    if (queue.length) setItems((list) => [...list, ...queue.splice(0)]);
    return () => {
      push = null;
    };
  }, []);

  function choose(button?: AlertButton) {
    setItems((list) => list.slice(1));
    button?.onPress?.();
  }

  const cancel = current?.buttons.find((b) => b.style === 'cancel');

  useEffect(() => {
    if (!current) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') choose(cancel);
      if (e.key === 'Enter' && current.buttons.length === 1) choose(current.buttons[0]);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (!current) return null;
  // Cancel on the left, the main action on the right — like the app's own dialogs.
  const ordered = [...current.buttons].sort((a, b) => Number(b.style === 'cancel') - Number(a.style === 'cancel'));

  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => choose(cancel)}>
      <Pressable style={styles.backdrop} onPress={() => cancel && choose(cancel)}>
        <Pressable
          style={[styles.dialog, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
          onPress={(e) => e.stopPropagation()}
        >
          <Text style={[styles.title, { color: theme.colors.text }]}>{current.title}</Text>
          {current.message ? <Text style={[styles.message, { color: theme.colors.textMuted }]}>{current.message}</Text> : null}
          <View style={[styles.buttons, ordered.length > 2 && styles.stacked]}>
            {ordered.map((b, i) => {
              const primary = b.style !== 'cancel' && i === ordered.length - 1;
              const color = b.style === 'destructive' ? theme.colors.danger : primary ? theme.colors.primary : theme.colors.surfaceAlt;
              const textColor = b.style === 'destructive' || primary ? '#fff' : theme.colors.text;
              return (
                <Pressable
                  key={`${b.text}-${i}`}
                  onPress={() => choose(b)}
                  style={[styles.button, ordered.length <= 2 && styles.flex, { backgroundColor: color }]}
                >
                  <Text style={[styles.buttonText, { color: textColor }]}>{b.text}</Text>
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  dialog: { width: '100%', maxWidth: 380, borderRadius: 18, borderWidth: 1, padding: 20, gap: 10 },
  title: { fontSize: 17, fontWeight: '800' },
  message: { fontSize: 14, lineHeight: 20 },
  buttons: { flexDirection: 'row', gap: 8, marginTop: 8 },
  stacked: { flexDirection: 'column' },
  button: { paddingVertical: 11, paddingHorizontal: 14, borderRadius: 12, alignItems: 'center' },
  buttonText: { fontSize: 14, fontWeight: '700' },
  flex: { flex: 1 },
});
