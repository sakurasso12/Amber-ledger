import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { addDays } from 'date-fns';
import { useTheme } from '@/theme/ThemeProvider';
import { Button, TextField } from '@/components/ui';
import { useSettingsStore } from '@/store/useSettingsStore';
import { PeriodEarnings } from '@/lib/earnings';
import { formatRangeLabel } from '@/lib/dateRanges';
import { useTranslation } from '@/i18n';

interface SalaryPromptProps {
  /** The closed pay period whose payday has come and which isn't confirmed yet. */
  due: PeriodEarnings;
  currency: string;
}

/**
 * "Did you get your salary yet?" — shown at the top of the Finance tab from payday until the user
 * answers. "Yes" / a corrected amount moves the money into Bank; "remind me in a day" hides the
 * prompt for 24 hours (FinanceScreen reschedules the notification for that moment).
 */
export function SalaryPrompt({ due, currency }: SalaryPromptProps) {
  const theme = useTheme();
  const tr = useTranslation();
  const settings = useSettingsStore((s) => s.settings);
  const updateSettings = useSettingsStore((s) => s.updateSettings);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  function confirm(amount: number) {
    updateSettings({
      salaryConfirmations: {
        ...settings.salaryConfirmations,
        [due.key]: { amount, confirmedAt: new Date().toISOString() },
      },
      salaryPromptSnoozedUntil: null,
    });
  }

  function saveOtherAmount() {
    const amount = parseFloat(draft.replace(',', '.'));
    if (!Number.isFinite(amount) || amount < 0) return;
    confirm(amount);
    setEditing(false);
  }

  function snooze() {
    updateSettings({ salaryPromptSnoozedUntil: addDays(new Date(), 1).toISOString() });
  }

  const expected = `${due.amount.toFixed(0)} ${currency}`;
  const period = formatRangeLabel(due.period, tr.localeCode);

  return (
    <View style={[styles.card, { backgroundColor: `${theme.colors.accent}1F`, borderColor: theme.colors.accent }]}>
      <Text style={[styles.title, { color: theme.colors.text }]}>💰 {tr.salaryPrompt.title}</Text>
      <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>{tr.salaryPrompt.expected(expected, period)}</Text>

      {editing ? (
        <View style={styles.editor}>
          <TextField
            label={tr.salaryPrompt.amountLabel}
            value={draft}
            onChangeText={setDraft}
            keyboardType="decimal-pad"
            autoFocus
          />
          <View style={styles.row}>
            <Button title={tr.salaryPrompt.cancel} variant="secondary" onPress={() => setEditing(false)} style={styles.button} />
            <Button title={tr.salaryPrompt.save} onPress={saveOtherAmount} style={styles.button} />
          </View>
        </View>
      ) : (
        <View style={styles.actions}>
          <Button title={tr.salaryPrompt.yes} onPress={() => confirm(due.amount)} />
          <View style={styles.row}>
            <Button
              title={tr.salaryPrompt.otherAmount}
              variant="secondary"
              onPress={() => {
                setDraft(due.amount.toFixed(0));
                setEditing(true);
              }}
              style={styles.button}
            />
            <Button title={tr.salaryPrompt.snooze} variant="secondary" onPress={snooze} style={styles.button} />
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 6 },
  title: { fontSize: 15, fontWeight: '700' },
  subtitle: { fontSize: 12, lineHeight: 17 },
  actions: { gap: 8, marginTop: 6 },
  editor: { gap: 10, marginTop: 6 },
  row: { flexDirection: 'row', gap: 8 },
  button: { flex: 1 },
});
