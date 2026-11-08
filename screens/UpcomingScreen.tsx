import React, { useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { startOfMonth } from 'date-fns';
import { useTheme } from '@/theme/ThemeProvider';
import { cardSurface } from '@/theme/surfaces';
import { useFinanceStore } from '@/store/useFinanceStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { Button, DateField, Screen, SegmentedControl, SubScreenHeader, TextField } from '@/components/ui';
import { CategoryPicker } from '@/components/finance/CategoryPicker';
import { AccountPicker } from '@/components/finance/AccountPicker';
import { RecurrencePicker } from '@/components/task/RecurrencePicker';
import { addDaysToKey, toDateKey, todayKey } from '@/lib/dateRanges';
import { primaryId } from '@/lib/accounts';
import { categoryLabel } from '@/lib/categoryLabel';
import { haptics } from '@/lib/haptics';
import { useTranslation } from '@/i18n';
import { RecurrenceRule, Upcoming, UpcomingMode } from '@/types';

/**
 * Upcoming payments (finance v2) — what used to be "planned" and "recurring" expenses, in one list
 * with one "add". Each is on a date, some time this month, or repeating. When its day comes it
 * waits in "Awaiting answer" on Finance; only a "paid" there turns it into an expense.
 */
export function UpcomingScreen() {
  const theme = useTheme();
  const tr = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const appCurrency = useSettingsStore((s) => s.settings.currency);
  const categories = useFinanceStore((s) => s.categories);
  const accounts = useFinanceStore((s) => s.accounts);
  const upcoming = useFinanceStore((s) => s.upcoming);
  const addUpcoming = useFinanceStore((s) => s.addUpcoming);
  const removeUpcoming = useFinanceStore((s) => s.removeUpcoming);

  const categoryById = new Map(categories.map((c) => [c.id, c]));
  const pid = primaryId(accounts);
  const [mode, setMode] = useState<UpcomingMode>('date');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? '');
  const [accountId, setAccountId] = useState(pid);
  const [comment, setComment] = useState('');
  const [date, setDate] = useState(addDaysToKey(todayKey(), 1));
  const [rule, setRule] = useState<RecurrenceRule>({ freq: 'monthly', interval: 1, weekdays: null, until: null });

  async function handleAdd() {
    const parsed = parseFloat(amount.replace(',', '.'));
    if (!parsed || parsed <= 0 || !categoryId) return;
    await addUpcoming({
      amount: parsed,
      categoryId,
      accountId: accountId || null,
      comment: comment.trim() || null,
      mode,
      date: mode === 'month' ? toDateKey(startOfMonth(new Date())) : date,
      freq: mode === 'repeat' ? rule.freq : null,
      interval: mode === 'repeat' ? rule.interval : 1,
      weekdays: mode === 'repeat' ? rule.weekdays : null,
    });
    haptics.success();
    setAmount('');
    setComment('');
  }

  const freqLabel: Record<string, string> = {
    daily: tr.recurrence.daily,
    weekly: tr.recurrence.weekly,
    monthly: tr.recurrence.monthly,
  };
  const day = (key: string) => new Date(`${key}T12:00:00`).toLocaleDateString(tr.localeCode, { day: 'numeric', month: 'short' });
  const when = (u: Upcoming) =>
    u.mode === 'month' ? tr.money.thisMonth : u.mode === 'repeat' && u.freq ? tr.money.repeatsFrom(freqLabel[u.freq], day(u.date)) : tr.money.on(day(u.date));
  const currencyOf = (u: Upcoming) => accounts.find((a) => a.id === (u.accountId ?? pid))?.currency ?? appCurrency;
  const sorted = [...upcoming].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <Screen style={{ paddingTop: insets.top }}>
      <SubScreenHeader title={tr.money.upcomingTitle} />
      <FlatList
        data={sorted}
        keyExtractor={(u) => u.id}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={<Text style={[styles.hint, { color: theme.colors.textMuted }]}>{tr.money.upcomingHint}</Text>}
        ListEmptyComponent={<Text style={{ color: theme.colors.textMuted, fontSize: 13 }}>{tr.money.upcomingEmpty}</Text>}
        renderItem={({ item }) => (
          <View style={[styles.row, cardSurface(theme)]}>
            <View style={[styles.dot, { backgroundColor: categoryById.get(item.categoryId)?.color ?? theme.colors.textMuted }]} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowTitle, { color: theme.colors.text }]} numberOfLines={1}>
                {item.comment || categoryLabel(categoryById.get(item.categoryId), tr)}
              </Text>
              <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>{when(item)}</Text>
            </View>
            <Text style={[styles.amount, { color: theme.colors.danger }]}>
              {item.amount.toFixed(0)} {currencyOf(item)}
            </Text>
            <Pressable onPress={() => removeUpcoming(item.id)} hitSlop={8} accessibilityLabel={tr.money.remove}>
              <Text style={{ color: theme.colors.danger, fontSize: 15 }}>✕</Text>
            </Pressable>
          </View>
        )}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        ListFooterComponent={
          <View style={styles.addSection}>
            <SegmentedControl<UpcomingMode>
              value={mode}
              onChange={setMode}
              segments={[
                { value: 'date', label: tr.money.modeDate },
                { value: 'month', label: tr.money.modeMonth },
                { value: 'repeat', label: tr.money.modeRepeat },
              ]}
            />
            <TextField label={tr.money.commentLabel} value={comment} onChangeText={setComment} placeholder={tr.expenseEditor.commentPlaceholder} />
            <TextField label={tr.expenseEditor.amountLabel} value={amount} onChangeText={setAmount} placeholder="0" keyboardType="decimal-pad" />
            <CategoryPicker categories={categories} value={categoryId} onChange={setCategoryId} />
            <AccountPicker label={tr.money.payFrom} value={accountId} onChange={setAccountId} />
            {mode === 'month' ? null : <DateField label={tr.money.firstDate} value={date} onChange={setDate} />}
            {mode === 'repeat' ? (
              <RecurrencePicker value={rule} onChange={(r) => setRule(r ?? { freq: 'monthly', interval: 1, weekdays: null, until: null })} />
            ) : null}
            <Button title={tr.money.add} onPress={handleAdd} />
          </View>
        }
      />
      <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/finance'))} style={styles.doneButton}>
        <Text style={{ color: theme.colors.accent, fontWeight: '600' }}>{tr.categoryManager.done}</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingBottom: 32, gap: 8, width: '100%', maxWidth: 720, alignSelf: 'center' },
  hint: { fontSize: 12, lineHeight: 18, marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 14, borderWidth: 1 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  rowTitle: { fontSize: 14, fontWeight: '600' },
  amount: { fontSize: 14, fontWeight: '700' },
  addSection: { gap: 14, marginTop: 20 },
  doneButton: { alignItems: 'center', paddingVertical: 14 },
});
