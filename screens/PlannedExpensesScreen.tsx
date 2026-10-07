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
import { useTranslation } from '@/i18n';
import { categoryLabel } from '@/lib/categoryLabel';

export function PlannedExpensesScreen() {
  const theme = useTheme();
  const tr = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const currency = useSettingsStore((s) => s.settings.currency);
  const categories = useFinanceStore((s) => s.categories);
  const plannedExpenses = useFinanceStore((s) => s.plannedExpenses);
  const addPlannedExpense = useFinanceStore((s) => s.addPlannedExpense);
  const removePlannedExpense = useFinanceStore((s) => s.removePlannedExpense);

  const categoryById = new Map(categories.map((c) => [c.id, c]));
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? '');
  const [comment, setComment] = useState('');
  const total = plannedExpenses.reduce((sum, p) => sum + p.amount, 0);

  async function handleAdd() {
    const parsed = parseFloat(amount.replace(',', '.'));
    if (!parsed || parsed <= 0 || !categoryId) return;
    await addPlannedExpense({ amount: parsed, categoryId, comment: comment || null });
    setAmount('');
    setComment('');
  }

  return (
    <Screen style={{ paddingTop: insets.top }}>
      <SubScreenHeader title={tr.plannedExpenses.title} />
      <FlatList
        data={plannedExpenses}
        keyExtractor={(p) => p.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <Text style={[styles.hint, { color: theme.colors.textMuted }]}>
            {tr.plannedExpenses.hint} {total > 0 ? `${tr.plannedExpenses.totalLabel}: ${total.toFixed(0)} ${currency}` : ''}
          </Text>
        }
        renderItem={({ item }) => (
          <View style={[styles.row, cardSurface(theme)]}>
            <View style={[styles.dot, { backgroundColor: categoryById.get(item.categoryId)?.color ?? theme.colors.textMuted }]} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowTitle, { color: theme.colors.text }]}>{categoryLabel(categoryById.get(item.categoryId), tr)}</Text>
              {item.comment ? <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>{item.comment}</Text> : null}
            </View>
            <Text style={[styles.amount, { color: theme.colors.danger }]}>
              {item.amount.toFixed(0)} {currency}
            </Text>
            <Pressable onPress={() => removePlannedExpense(item.id)} hitSlop={8}>
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
            <Button title={tr.plannedExpenses.addButton} onPress={handleAdd} />
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
  addSection: { gap: 12, marginTop: 20 },
  doneButton: { alignItems: 'center', paddingVertical: 14 },
});
