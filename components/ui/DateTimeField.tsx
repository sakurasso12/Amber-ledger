import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import DateTimePicker from '@expo/ui/community/datetime-picker';
import { useTheme } from '@/theme/ThemeProvider';
import { useTranslation } from '@/i18n';
import { Chip } from './Chip';

interface DateTimeFieldProps {
  label: string;
  value: string | null;
  onChange: (iso: string | null) => void;
  /** Hides the date control, keeping only the time one — for recurring tasks, where the reminder
   * fires on a repeating schedule and only the time of day is meaningful. The date component of
   * `value` is left as-is (defaults to today when a deadline is first set). */
  dateEditable?: boolean;
}

/** Native platform date/time pickers (@expo/ui's drop-in replacement for
 * @react-native-community/datetimepicker) instead of free-text DD.MM.YYYY / HH:MM fields — no
 * parsing, no invalid states, automatically localized. Android's Material 3 dialog picker has no
 * combined datetime mode (confirmed in @expo/ui's own Android implementation, which silently
 * drops the time component), so Android always shows date and time as two separate dialogs;
 * iOS's inline "compact" style handles `mode="datetime"` natively in one control. */
export function DateTimeField({ label, value, onChange, dateEditable = true }: DateTimeFieldProps) {
  const theme = useTheme();
  const tr = useTranslation();
  const hasDeadline = value !== null;
  const current = value ? new Date(value) : new Date();
  const [androidOpen, setAndroidOpen] = useState<'date' | 'time' | null>(null);

  function toggleDeadline() {
    onChange(hasDeadline ? null : new Date().toISOString());
  }

  function commitAndroid(mode: 'date' | 'time', picked: Date) {
    const next = new Date(current);
    if (mode === 'date') next.setFullYear(picked.getFullYear(), picked.getMonth(), picked.getDate());
    else next.setHours(picked.getHours(), picked.getMinutes());
    onChange(next.toISOString());
    setAndroidOpen(null);
  }

  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <Text style={[styles.label, { color: theme.colors.textMuted }]}>{label}</Text>
        <Chip label={hasDeadline ? tr.dateTimeField.noDeadline : tr.dateTimeField.setDeadline} onPress={toggleDeadline} />
      </View>

      {hasDeadline ? (
        Platform.OS === 'android' ? (
          <View style={styles.row}>
            {dateEditable ? (
              <Pressable
                style={[styles.pill, styles.dateInput, { borderColor: theme.colors.border }]}
                onPress={() => setAndroidOpen('date')}
              >
                <Text style={{ color: theme.colors.text }}>
                  {current.toLocaleDateString(tr.localeCode, { day: 'numeric', month: 'short', year: 'numeric' })}
                </Text>
              </Pressable>
            ) : null}
            <Pressable
              style={[styles.pill, styles.timeInput, { borderColor: theme.colors.border }]}
              onPress={() => setAndroidOpen('time')}
            >
              <Text style={{ color: theme.colors.text }}>
                {current.toLocaleTimeString(tr.localeCode, { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </Pressable>
            {androidOpen ? (
              <DateTimePicker
                value={current}
                mode={androidOpen}
                presentation="dialog"
                is24Hour
                onValueChange={(_event, picked) => commitAndroid(androidOpen, picked)}
                onDismiss={() => setAndroidOpen(null)}
              />
            ) : null}
          </View>
        ) : (
          <DateTimePicker
            value={current}
            mode={dateEditable ? 'datetime' : 'time'}
            display="compact"
            onValueChange={(_event, picked) => onChange(picked.toISOString())}
          />
        )
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 8 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { fontSize: 13, fontWeight: '600' },
  row: { flexDirection: 'row', gap: 8 },
  pill: { borderWidth: 1, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14 },
  dateInput: { flex: 1.3 },
  timeInput: { flex: 1 },
});
