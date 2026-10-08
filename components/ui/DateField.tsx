import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import DateTimePicker from '@expo/ui/community/datetime-picker';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { controlSurface } from '@/theme/surfaces';
import { useTranslation } from '@/i18n';
import { toDateKey } from '@/lib/dateRanges';
import { Text } from './Text';

interface DateFieldProps {
  label: string;
  /** yyyy-MM-dd */
  value: string;
  onChange: (dateKey: string) => void;
  /** Latest selectable day (e.g. today, for things that already happened). */
  maximumDate?: Date;
}

/**
 * A single date (no time), picked with the system calendar instead of typed as YYYY-MM-DD.
 * Android opens the Material date dialog on tap; iOS shows its compact inline picker.
 */
export function DateField({ label, value, onChange, maximumDate }: DateFieldProps) {
  const theme = useTheme();
  const tr = useTranslation();
  const [open, setOpen] = useState(false);
  const current = new Date(`${value}T12:00:00`);

  return (
    <View style={styles.wrapper}>
      <Text style={[styles.label, { color: theme.colors.textMuted }]}>{label}</Text>
      {Platform.OS === 'android' ? (
        <>
          <Pressable
            onPress={() => setOpen(true)}
            style={[styles.field, controlSurface(theme), { backgroundColor: theme.colors.surfaceAlt, borderColor: theme.colors.border }]}
          >
            <Text style={[styles.value, { color: theme.colors.text }]}>
              {current.toLocaleDateString(tr.localeCode, { day: 'numeric', month: 'long', year: 'numeric' })}
            </Text>
            <Ionicons name="calendar-outline" size={20} color={theme.colors.textMuted} />
          </Pressable>
          {open ? (
            <DateTimePicker
              value={current}
              mode="date"
              presentation="dialog"
              maximumDate={maximumDate}
              onValueChange={(_event, picked) => {
                setOpen(false);
                onChange(toDateKey(picked));
              }}
              onDismiss={() => setOpen(false)}
            />
          ) : null}
        </>
      ) : (
        <DateTimePicker
          value={current}
          mode="date"
          display="compact"
          maximumDate={maximumDate}
          onValueChange={(_event, picked) => onChange(toDateKey(picked))}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600' },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  value: { fontSize: 15 },
});
