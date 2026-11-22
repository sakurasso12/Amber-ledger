import React, { useState } from 'react';
import { ScrollView, StyleSheet, Switch, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { cardSurface } from '@/theme/surfaces';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useTaskStore } from '@/store/useTaskStore';
import { Chip, Screen, SubScreenHeader, TextField } from '@/components/ui';
import { ensureNotificationPermission } from '@/notifications';
import { useTranslation } from '@/i18n';
import { Pressable } from 'react-native';
import { Tymofii } from '@/components/mascot/Tymofii';
import { playPurr } from '@/lib/sounds';

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
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}>
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

        {/* 1.7: Тимофій & sounds */}
        <Text style={[styles.fieldLabel, { color: theme.colors.textMuted }]}>{tr.mascot.settingsTitle}</Text>
        <View style={[styles.mascotCard, cardSurface(theme)]}>
          {settings.mascotEnabled ? <Tymofii mood="calm" prop="note" size={64} /> : null}
          <View style={styles.soundText}>
            <Text style={{ color: theme.colors.text, fontSize: 15, fontWeight: '700' }}>{tr.mascot.purr}</Text>
            <Text style={[styles.note, { color: theme.colors.textMuted }]}>{tr.mascot.purrHint}</Text>
            <View style={styles.soundChoice}>
              {(['mix', 'purr', 'meow'] as const).map((k) => (
                <Chip key={k} label={k === 'purr' ? tr.mascot.soundPurr : k === 'meow' ? tr.mascot.soundMeow : tr.mascot.soundMix} selected={settings.mascotSound === k} onPress={() => { updateSettings({ mascotSound: k }); setTimeout(playPurr, 50); }} />
              ))}
            </View>
            <Pressable onPress={playPurr} style={[styles.listen, { borderColor: theme.colors.primary }]} accessibilityRole="button">
              <Text style={{ color: theme.colors.text, fontWeight: '700' }}>▶ {tr.mascot.listen}</Text>
            </Pressable>
          </View>
          <Switch
            value={settings.purrOnTask}
            onValueChange={(purrOnTask) => updateSettings({ purrOnTask })}
            trackColor={{ true: theme.colors.primary, false: theme.colors.border }}
            thumbColor={theme.colors.surface}
          />
        </View>
        {[
          { key: 'mascotEnabled', title: tr.mascot.toggle, hint: tr.mascot.toggleHint },
          { key: 'subscriptionReminders', title: tr.mascot.subReminders, hint: tr.mascot.subRemindersHint },
          { key: 'purrNotifications', title: tr.mascot.purrNotif, hint: tr.mascot.purrNotifHint },
        ].map((row) => (
          <View key={row.key} style={[styles.soundRow, cardSurface(theme)]}>
            <View style={styles.soundText}>
              <Text style={{ color: theme.colors.text, fontSize: 15, fontWeight: '600' }}>{row.title}</Text>
              <Text style={[styles.note, { color: theme.colors.textMuted }]}>{row.hint}</Text>
            </View>
            <Switch
              value={settings[row.key as 'mascotEnabled' | 'subscriptionReminders' | 'purrNotifications']}
              onValueChange={(v) => updateSettings({ [row.key]: v })}
              trackColor={{ true: theme.colors.primary, false: theme.colors.border }}
              thumbColor={theme.colors.surface}
            />
          </View>
        ))}
      </ScrollView>
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
  soundChoice: { flexDirection: 'row', gap: 8, marginTop: 6 },
  mascotCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  listen: { alignSelf: 'flex-start', borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, marginTop: 6 },
});
