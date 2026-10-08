import React, { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { BlurTargetView, BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { cardSurface } from '@/theme/surfaces';
import { useSettingsStore } from '@/store/useSettingsStore';
import { unlockWithDevice, unlockWithPassword, useFinanceLocked } from '@/store/useFinanceLock';
import { useTranslation } from '@/i18n';
import { haptics } from '@/lib/haptics';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { TextField } from '@/components/ui/TextField';

/**
 * Wraps anything that shows money. While Finance is locked the content stays in place but is
 * blurred, can't be touched, and a small unlock card sits on top.
 */
export function FinanceLockGate({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const locked = useFinanceLocked();
  const target = useRef<View>(null);

  return (
    <View style={styles.flex}>
      {/* On Android the blur needs to know which view to blur — that's what BlurTargetView marks. */}
      <BlurTargetView ref={target} style={[styles.flex, style]} pointerEvents={locked ? 'none' : 'auto'}>
        {children}
      </BlurTargetView>
      {locked ? <LockOverlay target={target} /> : null}
    </View>
  );
}

function LockOverlay({ target }: { target: React.RefObject<View | null> }) {
  const theme = useTheme();
  const tr = useTranslation();
  const method = useSettingsStore((s) => s.settings.financeLockMethod);
  const hasPassword = useSettingsStore((s) => !!s.settings.profilePasswordSet);
  // Nothing pops up by itself — the user taps Unlock first, then gets their chosen method.
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState(false);

  async function handleDevice() {
    const ok = await unlockWithDevice(tr.financeLock.prompt, tr.financeLock.cancel, method === 'fingerprint');
    if (ok) haptics.success();
  }

  async function handlePassword() {
    setChecking(true);
    setError(false);
    const ok = await unlockWithPassword(password);
    setChecking(false);
    if (ok) haptics.success();
    else {
      haptics.warning();
      setError(true);
    }
  }

  return (
    <View style={StyleSheet.absoluteFill}>
      <BlurView
        blurTarget={target}
        blurMethod="dimezisBlurViewSdk31Plus"
        intensity={60}
        tint={theme.dark ? 'dark' : 'light'}
        style={StyleSheet.absoluteFill}
      />
      {/* Extra veil: on Android versions without real blur the content would otherwise show through. */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: `${theme.colors.background}66` }]} />

      <View style={styles.center}>
        <View style={[styles.card, cardSurface(theme)]}>
          <View style={[styles.iconCircle, { backgroundColor: `${theme.colors.primary}22` }]}>
            <Ionicons name="lock-closed" size={28} color={theme.colors.primary} />
          </View>
          <Text style={[styles.title, { color: theme.colors.text }]}>{tr.financeLock.title}</Text>
          <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>{tr.financeLock.subtitle}</Text>

          {showPassword ? (
            <View style={styles.passwordBlock}>
              <TextField
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  setError(false);
                }}
                placeholder={tr.financeLock.passwordPlaceholder}
                secureTextEntry
                autoFocus
                onSubmitEditing={handlePassword}
              />
              {error ? <Text style={{ color: theme.colors.danger, fontSize: 13 }}>{tr.financeLock.wrongPassword}</Text> : null}
              {checking ? (
                <ActivityIndicator color={theme.colors.primary} />
              ) : (
                <Button title={tr.financeLock.unlock} onPress={handlePassword} disabled={!password} />
              )}
            </View>
          ) : (
            <Button
              title={tr.financeLock.unlock}
              onPress={method === 'password' ? () => setShowPassword(true) : handleDevice}
              style={styles.fullWidth}
            />
          )}

          {!showPassword && hasPassword && method !== 'password' ? (
            <Pressable onPress={() => setShowPassword(true)} hitSlop={8}>
              <Text style={[styles.link, { color: theme.colors.accent }]}>{tr.financeLock.usePassword}</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 360, padding: 22, gap: 12, alignItems: 'center' },
  iconCircle: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '800', textAlign: 'center' },
  subtitle: { fontSize: 14, textAlign: 'center', marginBottom: 4 },
  passwordBlock: { alignSelf: 'stretch', gap: 10 },
  fullWidth: { alignSelf: 'stretch' },
  link: { fontSize: 14, fontWeight: '600', marginTop: 2 },
});
