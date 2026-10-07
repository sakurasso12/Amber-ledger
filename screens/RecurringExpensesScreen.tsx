import React, { useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { cardSurface } from '@/theme/surfaces';
import { useFinanceStore } from '@/store/useFinanceStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { Button, Screen, SubScreenHeader, TextField } from '@/components/ui';
import { CategoryPicker } from '@/components/finance/CategoryPicker';
import { RecurrencePicker } from '@/components/task/RecurrencePicker';
import { todayKey } from '@/lib/dateRanges';
import { useTranslation } from '@/i18n';
import { RecurrenceRule } from '@/types';
import { categoryLabel } from '@/lib/categoryLabel';

export function RecurringExpensesScreen() {
  const theme = useTheme();
  const tr = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const currency = useSettingsStore((s) => s.settings.currency);
  const categories = useFinanceStore((s) => s.categories);
  const recurringExpenses = useFinanceStore((s) => s.recurringExpenses);
  const addRecurringExpense = useFinanceStore((s) => s.addRecurringExpense);
  const removeRecurringExpense = useFinanceStore((s) => s.removeRecurringExpense);

  const categoryById = new Map(categories.map((c) => [c.id, c]));
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? '');
  const [comment, setComment] = useState('');
  const [rule, setRule] = useState<RecurrenceRule | null>({ freq: 'monthly', interval: 1, weekdays: null, until: null });

  async function handleAdd() {
    const parsed = parseFloat(amount.replace(',', '.'));
    if (!parsed || parsed <= 0 || !categoryId || !rule) return;
    await addRecurringExpense({
      amount: parsed,
      categoryId,
      comment: comment || null,
      freq: rule.freq,
      interval: rule.interval,
      weekdays: rule.weekdays,
      nextDueDate: todayKey(),
    });
    setAmount('');
    setComment('');
  }

  const freqLabel: Record<string, string> = {
    daily: tr.recurrence.daily,
    weekly: tr.recurrence.weekly,
    monthly: tr.recurrence.monthly,
  };

  return (
    <Screen style={{ paddingTop: insets.top }}>
      <SubScreenHeader title={tr.recurringExpenses.title} />
      <FlatList
        data={recurringExpenses}
        keyExtractor={(r) => r.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={<Text style={[styles.hint, { color: theme.colors.textMuted }]}>{tr.recurringExpenses.hint}</Text>}
        renderItem={({ item }) => (
          <View style={[styles.row, cardSurface(theme)]}>
            <View style={[styles.dot, { backgroundColor: categoryById.get(item.categoryId)?.color ?? theme.colors.textMuted }]} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowTitle, { color: theme.colors.text }]}>{categoryLabel(categoryById.get(item.categoryId), tr)}</Text>
              <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>
                {freqLabel[item.freq]} · {tr.recurringExpenses.next} {item.nextDueDate}
              </Text>
            </View>
            <Text style={[styles.amount, { color: theme.colors.danger }]}>
              {item.amount.toFixed(0)} {currency}
            </Text>
            <Pressable onPress={() => removeRecurringExpense(item.id)} hitSlop={8}>
              <Text style={{ color: theme.colors.danger, fontSize: 15 }}>✕</Text>
            </Pressable>
          </View>
        )}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        ListFooterComponent={
          <View style={styles.addSection}>
            <TextField label={tr.expenseEditor.amountLabel} value={amount} onChangeText={setAmount} placeholder="0" keyboardType="decimal-pad" />
            <CategoryPicker categories={categories} value={categoryId} onChange={setCategoryId} />
            <TextField label={tr.expenseEditor.commentLabel} value={comment} onChangeText={setComment} placeholder={tr.expenseEditor.commentPlaceholder} />
            <RecurrencePicker value={rule} onChange={(r) => setRule(r ?? { freq: 'monthly', interval: 1, weekdays: null, until: null })} />
            <Button title={tr.recurringExpenses.addButton} onPress={handleAdd} />
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
  content: { paddingHorizontal: 16, paddingBottom: 32, gap: 8 },
  hint: { fontSize: 12, lineHeight: 18, marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 14, borderWidth: 1 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  rowTitle: { fontSize: 14, fontWeight: '600' },
  amount: { fontSize: 14, fontWeight: '700' },
  addSection: { gap: 14, marginTop: 20 },
  doneButton: { alignItems: 'center', paddingVertical: 14 },
});
