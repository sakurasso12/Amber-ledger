import React, { useState } from 'react';
import { ScrollView, StyleSheet, Switch, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { useSettingsStore } from '@/store/useSettingsStore';
import { Screen, SubScreenHeader, TextField } from '@/components/ui';
import { useTranslation } from '@/i18n';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: theme.colors.textMuted }]}>{label}</Text>
      {children}
    </View>
  );
}

/** Brings back (or hides) the savings cushion card at the bottom of Finance. */
function SavingsToggle() {
  const theme = useTheme();
  const tr = useTranslation();
  const savingsCard = useSettingsStore((s) => s.settings.savingsCard);
  const updateSettings = useSettingsStore((s) => s.updateSettings);
  return (
    <View style={styles.toggleRow}>
      <View style={styles.toggleText}>
        <Text style={{ color: theme.colors.text, fontSize: 15, fontWeight: '600' }}>{tr.savings.settingsToggle}</Text>
        <Text style={{ color: theme.colors.textMuted, fontSize: 12, lineHeight: 17 }}>{tr.savings.settingsToggleHint}</Text>
      </View>
      <Switch
        value={savingsCard === 'on'}
        onValueChange={(on) => updateSettings({ savingsCard: on ? 'on' : 'off' })}
        trackColor={{ true: theme.colors.primary, false: theme.colors.border }}
        thumbColor={theme.colors.surface}
      />
    </View>
  );
}

export function BudgetSettingsScreen() {
  const tr = useTranslation();
  const insets = useSafeAreaInsets();
  const settings = useSettingsStore((s) => s.settings);
  const updateSettings = useSettingsStore((s) => s.updateSettings);

  const [budgetWeek, setBudgetWeek] = useState(settings.budgetLimitWeek ? String(settings.budgetLimitWeek) : '');
  const [budgetMonth, setBudgetMonth] = useState(settings.budgetLimitMonth ? String(settings.budgetLimitMonth) : '');

  function commitOptionalNumber(text: string, setter: (v: string) => void, key: 'budgetLimitWeek' | 'budgetLimitMonth') {
    setter(text);
    if (!text.trim()) {
      updateSettings({ [key]: null });
      return;
    }
    const n = parseFloat(text.replace(',', '.'));
    if (Number.isFinite(n)) updateSettings({ [key]: n });
  }

  return (
    <Screen style={{ paddingTop: insets.top }}>
      <SubScreenHeader title={tr.budgetSettings.title} />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}>
        <Field label={tr.budgetSettings.weekLimit}>
          <TextField
            value={budgetWeek}
            onChangeText={(t) => commitOptionalNumber(t, setBudgetWeek, 'budgetLimitWeek')}
            placeholder={tr.budgetSettings.notSetPlaceholder}
            keyboardType="decimal-pad"
          />
        </Field>
        <Field label={tr.budgetSettings.monthLimit}>
          <TextField
            value={budgetMonth}
            onChangeText={(t) => commitOptionalNumber(t, setBudgetMonth, 'budgetLimitMonth')}
            placeholder={tr.budgetSettings.notSetPlaceholder}
            keyboardType="decimal-pad"
          />
        </Field>
        <SavingsToggle />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 },
  toggleText: { flex: 1, gap: 2 },
  content: { paddingHorizontal: 16, paddingBottom: 32, gap: 16 },
  field: { gap: 6 },
  fieldLabel: { fontSize: 12, fontWeight: '600' },
});
