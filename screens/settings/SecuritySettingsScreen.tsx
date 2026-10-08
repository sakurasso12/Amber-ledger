import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { cardSurface } from '@/theme/surfaces';
import { useSettingsStore } from '@/store/useSettingsStore';
import { deviceAuthAvailable, lockFinances } from '@/store/useFinanceLock';
import { Ionicons } from '@expo/vector-icons';
import { Button, PressableScale, Screen, SubScreenHeader, Text, TextField } from '@/components/ui';
import { FINANCE_LOCK_MAX_MINUTES, FinanceLockMethod } from '@/types';
import { useTranslation } from '@/i18n';

const METHODS: { value: FinanceLockMethod; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'device', icon: 'finger-print' },
  { value: 'password', icon: 'key-outline' },
];

/** Settings → Security: whether Finance is locked, how to unlock it, and how soon it re-locks. */
export function SecuritySettingsScreen() {
  const theme = useTheme();
  const tr = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const settings = useSettingsStore((s) => s.settings);
  const updateSettings = useSettingsStore((s) => s.updateSettings);
  const [minutesText, setMinutesText] = useState(String(settings.financeLockMinutes));
  const [hasBiometrics, setHasBiometrics] = useState(true);
  const hasPassword = settings.profilePasswordSet;

  useEffect(() => {
    // Without an enrolled fingerprint the phone's PIN/pattern does the job — just say so.
    deviceAuthAvailable().then(setHasBiometrics);
  }, []);

  const methodLabel = (method: FinanceLockMethod) =>
    method === 'device' ? tr.securitySettings.methodDevice : tr.securitySettings.methodPassword;

  function toggleLock(enabled: boolean) {
    updateSettings({ financeLockEnabled: enabled });
    // Turning the lock on locks right away, so the next visit to Finance already asks to unlock
    // (and the timer starts from that unlock). Turning it off just clears the window.
    lockFinances();
  }

  function commitMinutes(text: string) {
    const digits = text.replace(/[^0-9]/g, '');
    const n = Math.min(FINANCE_LOCK_MAX_MINUTES, digits === '' ? 0 : parseInt(digits, 10));
    setMinutesText(digits === '' ? '' : String(n));
    updateSettings({ financeLockMinutes: n });
  }

  return (
    <Screen style={{ paddingTop: insets.top }}>
      <SubScreenHeader title={tr.securitySettings.title} />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]} keyboardShouldPersistTaps="handled">
        <View style={[styles.card, cardSurface(theme)]}>
          <View style={styles.switchRow}>
            <Text style={[styles.rowTitle, { color: theme.colors.text }]}>{tr.securitySettings.lockFinances}</Text>
            <Switch
              value={settings.financeLockEnabled}
              onValueChange={toggleLock}
              disabled={!hasPassword && !settings.financeLockEnabled}
              trackColor={{ true: theme.colors.primary, false: theme.colors.border }}
              thumbColor={theme.colors.surface}
            />
          </View>
          <Text style={[styles.hint, { color: theme.colors.textMuted }]}>{tr.securitySettings.lockFinancesHint}</Text>
        </View>

        {!hasPassword ? (
          // The profile password is the way back in if the fingerprint fails, so it comes first.
          <View style={[styles.card, cardSurface(theme)]}>
            <Text style={[styles.hint, { color: theme.colors.text }]}>{tr.securitySettings.needPassword}</Text>
            <Button title={tr.securitySettings.goToProfile} onPress={() => router.push('/settings/profile' as never)} />
          </View>
        ) : null}

        {settings.financeLockEnabled ? (
          <>
            <View style={styles.field}>
              <Text style={[styles.label, { color: theme.colors.textMuted }]}>{tr.securitySettings.method}</Text>
              <View style={[styles.methodList, cardSurface(theme)]}>
                {METHODS.map(({ value, icon }, i) => {
                  const selected = settings.financeLockMethod === value;
                  return (
                    <PressableScale
                      key={value}
                      scaleTo={0.98}
                      onPress={() => updateSettings({ financeLockMethod: value })}
                      style={[
                        styles.methodRow,
                        i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.border },
                      ]}
                    >
                      <Ionicons name={icon} size={22} color={selected ? theme.colors.primary : theme.colors.textMuted} />
                      <Text style={[styles.methodLabel, { color: theme.colors.text }]}>{methodLabel(value)}</Text>
                      <Ionicons
                        name={selected ? 'radio-button-on' : 'radio-button-off'}
                        size={22}
                        color={selected ? theme.colors.primary : theme.colors.textMuted}
                      />
                    </PressableScale>
                  );
                })}
              </View>
              {!hasBiometrics ? (
                <Text style={[styles.hint, { color: theme.colors.textMuted }]}>{tr.securitySettings.noBiometrics}</Text>
              ) : null}
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: theme.colors.textMuted }]}>{tr.securitySettings.relockAfter}</Text>
              <View style={styles.minutesRow}>
                <View style={styles.minutesInput}>
                  <TextField
                    value={minutesText}
                    onChangeText={commitMinutes}
                    onBlur={() => setMinutesText(String(settings.financeLockMinutes))}
                    keyboardType="number-pad"
                    maxLength={2}
                  />
                </View>
                <Text style={[styles.rowTitle, { color: theme.colors.text }]}>{tr.securitySettings.minutes}</Text>
              </View>
              <Text style={[styles.hint, { color: theme.colors.textMuted }]}>{tr.securitySettings.relockHint(FINANCE_LOCK_MAX_MINUTES)}</Text>
            </View>
          </>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, gap: 16 },
  card: { padding: 16, gap: 10 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  rowTitle: { fontSize: 16, fontWeight: '600' },
  hint: { fontSize: 12, lineHeight: 17 },
  field: { gap: 8 },
  label: { fontSize: 12, fontWeight: '600' },
  methodList: { overflow: 'hidden' },
  methodRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 14 },
  methodLabel: { flex: 1, fontSize: 15, fontWeight: '600' },
  minutesRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  minutesInput: { width: 72 },
});
