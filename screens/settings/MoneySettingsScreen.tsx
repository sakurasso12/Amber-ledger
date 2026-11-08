import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useFinanceStore } from '@/store/useFinanceStore';
import { Chip, Screen, SubScreenHeader, TextField } from '@/components/ui';
import { useTranslation } from '@/i18n';

/** One currency's rate; saved on every change that parses. */
function RateField({ currency, app }: { currency: string; app: string }) {
  const tr = useTranslation();
  const rate = useSettingsStore((s) => s.settings.currencyRates[currency]);
  const updateSettings = useSettingsStore((s) => s.updateSettings);
  const [text, setText] = useState(rate ? String(rate) : '');
  return (
    <TextField
      label={tr.money.rateLabel(currency, app)}
      value={text}
      onChangeText={(t) => {
        setText(t);
        const n = parseFloat(t.replace(',', '.'));
        const rates = { ...useSettingsStore.getState().settings.currencyRates };
        if (Number.isFinite(n) && n > 0) rates[currency] = n;
        else if (!t.trim()) delete rates[currency];
        else return;
        updateSettings({ currencyRates: rates });
      }}
      keyboardType="decimal-pad"
      placeholder="0"
    />
  );
}

/**
 * Finance → Currencies (finance v2): exchange rates used to count spending in other currencies
 * into statistics and budgets, and the weekly balance check.
 */
export function MoneySettingsScreen() {
  const theme = useTheme();
  const tr = useTranslation();
  const insets = useSafeAreaInsets();
  const settings = useSettingsStore((s) => s.settings);
  const updateSettings = useSettingsStore((s) => s.updateSettings);
  const accounts = useFinanceStore((s) => s.accounts);
  const app = settings.currency;
  const foreign = [...new Set([...accounts.map((a) => a.currency), ...Object.keys(settings.currencyRates)])].filter((c) => c && c !== app);
  // getDay() numbers (0 = Sunday), shown Monday first like the calendar; weekdaysShort starts on Monday.
  const order = [1, 2, 3, 4, 5, 6, 0];

  return (
    <Screen style={{ paddingTop: insets.top }}>
      <SubScreenHeader title={tr.money.currenciesTitle} />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]} keyboardShouldPersistTaps="handled">
        <Text style={[styles.hint, { color: theme.colors.textMuted }]}>{tr.money.currenciesHint(app)}</Text>
        {foreign.length === 0 ? <Text style={{ color: theme.colors.textMuted, fontSize: 13 }}>{tr.money.noForeign}</Text> : null}
        {foreign.map((c) => (
          <RateField key={c} currency={c} app={app} />
        ))}

        <View style={styles.block}>
          <Text style={[styles.title, { color: theme.colors.text }]}>{tr.money.checkSettingsTitle}</Text>
          <Text style={[styles.hint, { color: theme.colors.textMuted }]}>{tr.money.checkSettingsHint}</Text>
          <View style={styles.chips}>
            <Chip label={tr.money.checkOff} selected={settings.reconcileWeekday === null} onPress={() => updateSettings({ reconcileWeekday: null })} />
            {order.map((d) => (
              <Chip key={d} label={tr.weekdaysShort[(d + 6) % 7]} selected={settings.reconcileWeekday === d} onPress={() => updateSettings({ reconcileWeekday: d })} />
            ))}
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingBottom: 32, gap: 16, width: '100%', maxWidth: 720, alignSelf: 'center' },
  hint: { fontSize: 12, lineHeight: 18 },
  block: { gap: 8, marginTop: 12 },
  title: { fontSize: 15, fontWeight: '700' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
});
