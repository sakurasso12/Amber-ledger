import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
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

export function EarningsSettingsScreen() {
  const theme = useTheme();
  const tr = useTranslation();
  const insets = useSafeAreaInsets();
  const settings = useSettingsStore((s) => s.settings);
  const updateSettings = useSettingsStore((s) => s.updateSettings);

  const [hourlyRate, setHourlyRate] = useState(String(settings.hourlyRate));
  const [hoursPerShift, setHoursPerShift] = useState(String(settings.hoursPerShift));
  const [currency, setCurrency] = useState(settings.currency);
  const [payPeriodStartDay, setPayPeriodStartDay] = useState(String(settings.payPeriodStartDay));
  const [paydayDay, setPaydayDay] = useState(String(settings.paydayDay));

  function commitNumber(text: string, setter: (v: string) => void, key: 'hourlyRate' | 'hoursPerShift') {
    setter(text);
    const n = parseFloat(text.replace(',', '.'));
    if (Number.isFinite(n)) updateSettings({ [key]: n });
  }

  function commitDay(text: string, setter: (v: string) => void, key: 'payPeriodStartDay' | 'paydayDay') {
    setter(text);
    const n = parseInt(text, 10);
    if (Number.isFinite(n) && n >= 1 && n <= 31) updateSettings({ [key]: n });
  }

  return (
    <Screen style={{ paddingTop: insets.top }}>
      <SubScreenHeader title={tr.earningsSettings.title} />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}>
        <Field label={tr.earningsSettings.hourlyRate}>
          <TextField value={hourlyRate} onChangeText={(t) => commitNumber(t, setHourlyRate, 'hourlyRate')} keyboardType="decimal-pad" />
        </Field>
        <Field label={tr.earningsSettings.hoursPerShift}>
          <TextField
            value={hoursPerShift}
            onChangeText={(t) => commitNumber(t, setHoursPerShift, 'hoursPerShift')}
            keyboardType="decimal-pad"
          />
        </Field>
        <Field label={tr.earningsSettings.currency}>
          <TextField
            value={currency}
            onChangeText={(t) => {
              setCurrency(t);
              updateSettings({ currency: t });
            }}
            placeholder="zł"
          />
        </Field>
        <Field label={tr.earningsSettings.payPeriodStartDay}>
          <TextField
            value={payPeriodStartDay}
            onChangeText={(t) => commitDay(t, setPayPeriodStartDay, 'payPeriodStartDay')}
            keyboardType="number-pad"
            placeholder="1"
          />
        </Field>
        <Text style={{ color: theme.colors.textMuted, fontSize: 12, lineHeight: 18 }}>{tr.earningsSettings.payPeriodHint}</Text>

        <Field label={tr.earningsSettings.paydayDay}>
          <TextField value={paydayDay} onChangeText={(t) => commitDay(t, setPaydayDay, 'paydayDay')} keyboardType="number-pad" placeholder="1" />
        </Field>
        <Text style={{ color: theme.colors.textMuted, fontSize: 12, lineHeight: 18 }}>{tr.earningsSettings.paydayHint}</Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingBottom: 32, gap: 16 },
  field: { gap: 6 },
  fieldLabel: { fontSize: 12, fontWeight: '600' },
});
