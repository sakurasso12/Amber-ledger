import React, { useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { useSettingsStore } from '@/store/useSettingsStore';
import { confirmWithDevice, deviceAuthAvailable } from '@/store/useFinanceLock';
import { checkProfilePassword } from '@/lib/password';
import { haptics } from '@/lib/haptics';
import { useTranslation } from '@/i18n';
import { Button } from './Button';
import { Text } from './Text';
import { TextField } from './TextField';
import { useKeyboardHeight } from './useKeyboardHeight';

/**
 * Who has to confirm:
 *  - 'finance': the way chosen in Security for unlocking Finance (fingerprint/PIN or password);
 *  - 'profile': the profile password, or the phone's lock when there's no password.
 */
export type AuthKind = 'finance' | 'profile';

/**
 * `ask(kind)` resolves true once it's confirmed, false if cancelled. Render `prompt` somewhere in
 * the screen — it's the password sheet, shown only while a password is being asked for.
 */
export function useAuthPrompt() {
  const theme = useTheme();
  const tr = useTranslation();
  const keyboardHeight = useKeyboardHeight();
  const [visible, setVisible] = useState(false);
  const [password, setPassword] = useState('');
  const [wrong, setWrong] = useState(false);
  const resolver = useRef<((ok: boolean) => void) | null>(null);

  function askPassword(): Promise<boolean> {
    setPassword('');
    setWrong(false);
    setVisible(true);
    return new Promise((resolve) => {
      resolver.current = resolve;
    });
  }

  function finish(ok: boolean) {
    setVisible(false);
    resolver.current?.(ok);
    resolver.current = null;
  }

  async function submit() {
    if (await checkProfilePassword(password)) {
      haptics.success();
      finish(true);
      return;
    }
    haptics.warning();
    setWrong(true);
  }

  async function ask(kind: AuthKind): Promise<boolean> {
    const { financeLockMethod, profilePasswordSet } = useSettingsStore.getState().settings;
    if (kind === 'finance' && financeLockMethod === 'device') return confirmWithDevice(tr.auth.devicePrompt, tr.auth.cancel);
    if (profilePasswordSet) return askPassword();
    if (await deviceAuthAvailable()) return confirmWithDevice(tr.auth.devicePrompt, tr.auth.cancel);
    // Nothing set up to check with — the confirmation dialogs before this are all there is.
    return true;
  }

  const prompt = (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => finish(false)}>
      <View style={[styles.backdrop, { paddingBottom: keyboardHeight }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => finish(false)} />
        <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <Text style={[styles.title, { color: theme.colors.text }]}>{tr.auth.title}</Text>
          <TextField
            label={tr.auth.passwordLabel}
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              setWrong(false);
            }}
            secureTextEntry
            autoFocus
            onSubmitEditing={submit}
          />
          {wrong ? <Text style={[styles.error, { color: theme.colors.danger }]}>{tr.auth.wrong}</Text> : null}
          <View style={styles.buttons}>
            <Button title={tr.auth.cancel} variant="secondary" onPress={() => finish(false)} style={styles.flex} />
            <Button title={tr.auth.confirm} onPress={submit} style={styles.flex} />
          </View>
        </View>
      </View>
    </Modal>
  );

  return { ask, prompt };
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 24 },
  card: { borderRadius: 20, borderWidth: 1, padding: 20, gap: 12 },
  title: { fontSize: 17, fontWeight: '800' },
  error: { fontSize: 13, fontWeight: '600' },
  buttons: { flexDirection: 'row', gap: 10 },
});
