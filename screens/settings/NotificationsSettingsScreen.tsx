import React, { useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { cardSurface } from '@/theme/surfaces';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useTaskStore } from '@/store/useTaskStore';
import { Chip, Screen, SubScreenHeader, TextField } from '@/components/ui';
import { ensureNotificationPermission } from '@/notifications';
import { useTranslation } from '@/i18n';

export function NotificationsSettingsScreen() {
  const theme = useTheme();
  const tr = useTranslation();
  const insets = useSafeAreaInsets();
  const settings = useSettingsStore((s) => s.settings);
  const updateSettings = useSettingsStore((s) => s.updateSettings);
  const resyncAllReminders = useTaskStore((s) => s.resyncAllReminders);

  const [reminderMinutes, setReminderMinutes] = useState(String(settings.reminderMinutesBefore));

  async function handleToggle() {
    if (!settings.notificationsEnabled) {
      const granted = await ensureNotificationPermission();
      updateSettings({ notificationsEnabled: granted });
      if (granted) resyncAllReminders();
    } else {
      updateSettings({ notificationsEnabled: false });
    }
  }

  function commitMinutes(text: string) {
    setReminderMinutes(text);
    const n = parseInt(text, 10);
    if (Number.isFinite(n) && n >= 0) {
      updateSettings({ reminderMinutesBefore: n });
      resyncAllReminders();
    }
  }

  return (
    <Screen style={{ paddingTop: insets.top }}>
      <SubScreenHeader title={tr.notificationsSettings.title} />
      <View style={styles.content}>
        <Chip
          label={settings.notificationsEnabled ? tr.notificationsSettings.enabled : tr.notificationsSettings.disabled}
          selected={settings.notificationsEnabled}
          onPress={handleToggle}
        />
        <View style={styles.field}>
          <Text style={[styles.fieldLabel, { color: theme.colors.textMuted }]}>{tr.notificationsSettings.reminderLabel}</Text>
          <TextField value={reminderMinutes} onChangeText={commitMinutes} keyboardType="number-pad" />
        </View>
        <Text style={[styles.note, { color: theme.colors.textMuted }]}>{tr.notificationsSettings.note}</Text>

        <View style={[styles.soundRow, cardSurface(theme)]}>
          <View style={styles.soundText}>
            <Text style={{ color: theme.colors.text, fontSize: 15, fontWeight: '600' }}>🔊 {tr.level.sound}</Text>
            <Text style={[styles.note, { color: theme.colors.textMuted }]}>{tr.level.soundHint}</Text>
          </View>
          <Switch
            value={settings.soundEffects}
            onValueChange={(soundEffects) => updateSettings({ soundEffects })}
            trackColor={{ true: theme.colors.primary, false: theme.colors.border }}
            thumbColor={theme.colors.surface}
          />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, gap: 16 },
  field: { gap: 6 },
  fieldLabel: { fontSize: 12, fontWeight: '600' },
  note: { fontSize: 12, lineHeight: 18 },
  soundRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  soundText: { flex: 1, gap: 2 },
});
