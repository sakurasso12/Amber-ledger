import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/theme/ThemeProvider';
import { SegmentedControl, TextField } from '@/components/ui';
import { useTranslation } from '@/i18n';
import { RecurrenceFreq, RecurrenceRule } from '@/types';

/** JS Date.getDay() values (0=Sun..6=Sat), in Mon-first display order. */
const WEEKDAY_VALUES = [1, 2, 3, 4, 5, 6, 0];

type Mode = 'none' | RecurrenceFreq;

interface RecurrencePickerProps {
  value: RecurrenceRule | null;
  onChange: (rule: RecurrenceRule | null) => void;
}

export function RecurrencePicker({ value, onChange }: RecurrencePickerProps) {
  const theme = useTheme();
  const tr = useTranslation();
  const mode: Mode = value?.freq ?? 'none';

  function setMode(next: Mode) {
    if (next === 'none') {
      onChange(null);
      return;
    }
    onChange({
      freq: next,
      interval: value?.interval ?? 1,
      weekdays: next === 'weekly' ? value?.weekdays ?? [] : null,
      until: null,
    });
  }

  function setInterval(text: string) {
    if (!value) return;
    const n = parseInt(text, 10);
    onChange({ ...value, interval: Number.isFinite(n) && n > 0 ? n : 1 });
  }

  function toggleWeekday(day: number) {
    if (!value) return;
    const current = value.weekdays ?? [];
    const next = current.includes(day) ? current.filter((d) => d !== day) : [...current, day];
    onChange({ ...value, weekdays: next });
  }

  return (
    <View style={styles.wrapper}>
      <Text style={[styles.label, { color: theme.colors.textMuted }]}>{tr.recurrence.title}</Text>
      <SegmentedControl<Mode>
        value={mode}
        onChange={setMode}
        segments={[
          { value: 'none', label: tr.recurrence.none },
          { value: 'daily', label: tr.recurrence.daily },
          { value: 'weekly', label: tr.recurrence.weekly },
          { value: 'monthly', label: tr.recurrence.monthly },
        ]}
      />

      {value && mode === 'weekly' ? (
        <View style={styles.weekdaysRow}>
          {WEEKDAY_VALUES.map((wdValue, index) => {
            const active = value.weekdays?.includes(wdValue) ?? false;
            return (
              <Pressable
                key={wdValue}
                onPress={() => toggleWeekday(wdValue)}
                style={[
                  styles.weekdayChip,
                  {
                    backgroundColor: active ? theme.colors.primary : theme.colors.surfaceAlt,
                    borderColor: active ? theme.colors.primary : theme.colors.border,
                  },
                ]}
              >
                <Text style={{ color: active ? theme.colors.primaryText : theme.colors.text, fontSize: 12, fontWeight: '600' }}>
                  {tr.weekdaysShort[index]}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {value ? (
        <View style={styles.intervalRow}>
          <Text style={{ color: theme.colors.textMuted, fontSize: 13 }}>{tr.recurrence.every}</Text>
          <TextField
            style={styles.intervalInput}
            value={String(value.interval)}
            onChangeText={setInterval}
            keyboardType="number-pad"
          />
          <Text style={{ color: theme.colors.textMuted, fontSize: 13 }}>
            {mode === 'daily' ? tr.recurrence.unitDays : mode === 'weekly' ? tr.recurrence.unitWeeks : tr.recurrence.unitMonths}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 10 },
  label: { fontSize: 13, fontWeight: '600' },
  weekdaysRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  weekdayChip: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 100, borderWidth: 1 },
  intervalRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  intervalInput: { width: 60 },
});
