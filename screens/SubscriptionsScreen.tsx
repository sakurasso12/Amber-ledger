import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/Text';
import { Button, DateField, Screen, SubScreenHeader, TextField } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';
import { cardSurface } from '@/theme/surfaces';
import { useFinanceStore } from '@/store/useFinanceStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useTranslation } from '@/i18n';
import { addDaysToKey, todayKey } from '@/lib/dateRanges';
import { fmtAmount } from '@/lib/money';
import { haptics } from '@/lib/haptics';
import { monthlyTotal, subscriptionsOf } from '@/lib/subscriptions';
import { Tymofii } from '@/components/mascot/Tymofii';

const parse = (text: string) => {
  const n = parseFloat(text.replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
};

/**
 * Subscriptions (1.7): monthly repeat payments kept as `upcoming` items (so the day they're due they
 * land in "Awaiting answer" like any other payment) plus their ids in settings.subscriptionIds.
 */
export function SubscriptionsScreen() {
  const theme = useTheme();
  const tr = useTranslation();
  const insets = useSafeAreaInsets();
  const upcoming = useFinanceStore((s) => s.upcoming);
  const addUpcoming = useFinanceStore((s) => s.addUpcoming);
  const removeUpcoming = useFinanceStore((s) => s.removeUpcoming);
  const ids = useSettingsStore((s) => s.settings.subscriptionIds);
  const currency = useSettingsStore((s) => s.settings.currency);
  const updateSettings = useSettingsStore((s) => s.updateSettings);

  const subs = useMemo(() => subscriptionsOf(upcoming, ids), [upcoming, ids]);
  const total = monthlyTotal(subs);
  const today = todayKey();
  const tomorrow = addDaysToKey(today, 1);
  const soon = subs.find((s) => s.date === today || s.date === tomorrow);

  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [amountText, setAmountText] = useState('');
  const [date, setDate] = useState(tomorrow);
  const amount = parse(amountText);
  const money = (n: number) => `${fmtAmount(n)} ${currency}`;
  const day = (key: string) => new Date(`${key}T12:00:00`).toLocaleDateString(tr.localeCode, { day: 'numeric', month: 'short' });

  async function save() {
    if (!name.trim() || amount === null) return;
    const id = await addUpcoming({
      amount,
      categoryId: 'cat-subscriptions',
      accountId: null,
      comment: name.trim(),
      mode: 'repeat',
      date,
      freq: 'monthly',
      interval: 1,
      weekdays: null,
    });
    const s = useSettingsStore.getState().settings;
    updateSettings({ subscriptionIds: [...s.subscriptionIds, id] });
    haptics.success();
    setAdding(false);
    setName('');
    setAmountText('');
    setDate(tomorrow);
  }

  function remove(id: string, label: string) {
    Alert.alert(tr.subscriptions.removeConfirm(label), undefined, [
      { text: tr.subscriptions.cancel, style: 'cancel' },
      {
        text: tr.subscriptions.remove,
        style: 'destructive',
        onPress: async () => {
          await removeUpcoming(id);
          const s = useSettingsStore.getState().settings;
          updateSettings({ subscriptionIds: s.subscriptionIds.filter((x) => x !== id) });
        },
      },
    ]);
  }

  return (
    <Screen style={{ paddingTop: insets.top }}>
      <SubScreenHeader title={tr.subscriptions.title} />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}>
        <View style={[styles.totalCard, cardSurface(theme)]}>
          <View style={styles.flex}>
            <Text style={[styles.kicker, { color: theme.colors.textMuted }]}>{tr.subscriptions.monthly}</Text>
            <Text style={[styles.total, { color: theme.colors.text }]}>{money(total)}</Text>
            <Text style={[styles.muted, { color: theme.colors.textMuted }]}>
              {tr.subscriptions.count(subs.length)} · {tr.subscriptions.perYear(money(total * 12))}
            </Text>
          </View>
          <Tymofii mood="happy" prop="coin" size={72} />
        </View>

        {soon ? (
          <View style={[styles.soon, { backgroundColor: `${theme.colors.primary}26`, borderColor: theme.colors.primary }]}>
            <Tymofii mood="open" prop="bell" size={48} />
            <Text style={[styles.soonText, { color: theme.colors.text }]}>
              {tr.subscriptions.dueSoon(soon.comment ?? '', soon.date === today ? tr.subscriptions.today : tr.subscriptions.tomorrow)} ·{' '}
              {money(soon.amount)}
            </Text>
          </View>
        ) : null}

        {subs.length === 0 && !adding ? (
          <View style={[styles.emptyCard, cardSurface(theme)]}>
            <Tymofii mood="sleep" prop="zzz" size={72} />
            <Text style={[styles.muted, styles.flex, { color: theme.colors.textMuted }]}>{tr.subscriptions.empty}</Text>
          </View>
        ) : null}

        {subs.length > 0 ? (
          <View style={[styles.list, cardSurface(theme)]}>
            {subs.map((s, i) => (
              <Pressable
                key={s.id}
                onLongPress={() => remove(s.id, s.comment ?? '')}
                style={[styles.row, i < subs.length - 1 ? { borderBottomWidth: 1, borderBottomColor: theme.colors.border } : null]}
              >
                <View style={[styles.letter, { backgroundColor: `${theme.colors.primary}33` }]}>
                  <Text style={[styles.letterText, { color: theme.colors.accent }]}>{(s.comment ?? '?').slice(0, 1).toUpperCase()}</Text>
                </View>
                <View style={styles.flex}>
                  <Text style={[styles.rowName, { color: theme.colors.text }]} numberOfLines={1}>
                    {s.comment}
                  </Text>
                  <Text style={[styles.muted, { color: theme.colors.textMuted }]}>{tr.subscriptions.nextOn(day(s.date))}</Text>
                </View>
                <Text style={[styles.rowAmount, { color: theme.colors.text }]}>{money(s.amount)}</Text>
                <Pressable onPress={() => remove(s.id, s.comment ?? '')} hitSlop={10} accessibilityLabel={tr.subscriptions.remove}>
                  <Text style={{ color: theme.colors.textMuted, fontSize: 18 }}>×</Text>
                </Pressable>
              </Pressable>
            ))}
          </View>
        ) : null}

        {adding ? (
          <View style={[styles.form, cardSurface(theme)]}>
            <TextField label={tr.subscriptions.nameLabel} value={name} onChangeText={setName} placeholder={tr.subscriptions.namePlaceholder} autoFocus />
            <TextField label={tr.money.amountLabel(currency)} value={amountText} onChangeText={setAmountText} keyboardType="decimal-pad" />
            <DateField label={tr.subscriptions.dateLabel} value={date} onChange={setDate} />
            <View style={styles.buttons}>
              <Button title={tr.subscriptions.cancel} variant="secondary" onPress={() => setAdding(false)} style={styles.flex} />
              <Button title={tr.subscriptions.save} onPress={save} disabled={!name.trim() || amount === null} style={styles.flex} />
            </View>
          </View>
        ) : (
          <Button title={tr.subscriptions.add} onPress={() => setAdding(true)} />
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, gap: 12 },
  flex: { flex: 1 },
  totalCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  kicker: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  total: { fontSize: 28, fontWeight: '800' },
  muted: { fontSize: 13, lineHeight: 18 },
  soon: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 16, padding: 12 },
  soonText: { flex: 1, fontSize: 14, fontWeight: '700' },
  emptyCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  list: { paddingHorizontal: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  letter: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  letterText: { fontSize: 18, fontWeight: '800' },
  rowName: { fontSize: 15, fontWeight: '700' },
  rowAmount: { fontSize: 15, fontWeight: '700' },
  form: { padding: 16, gap: 12 },
  buttons: { flexDirection: 'row', gap: 8 },
});
