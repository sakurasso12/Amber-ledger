import React, { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/Text';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { useFinanceStore } from '@/store/useFinanceStore';
import { Button, Screen, TextField } from '@/components/ui';
import { CategoryPicker } from '@/components/finance/CategoryPicker';
import { todayKey } from '@/lib/dateRanges';
import { useTranslation } from '@/i18n';

export function ExpenseEditorScreen() {
  const theme = useTheme();
  const tr = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id?: string }>();

  const expenses = useFinanceStore((s) => s.expenses);
  const categories = useFinanceStore((s) => s.categories);
  const addExpense = useFinanceStore((s) => s.addExpense);
  const editExpense = useFinanceStore((s) => s.editExpense);
  const removeExpense = useFinanceStore((s) => s.removeExpense);

  const existing = useMemo(() => expenses.find((e) => e.id === params.id), [expenses, params.id]);
  const isEditing = !!existing;

  const [amount, setAmount] = useState(existing ? String(existing.amount) : '');
  const [categoryId, setCategoryId] = useState(existing?.categoryId ?? categories[0]?.id ?? '');
  const [date, setDate] = useState(existing?.date ?? todayKey());
  const [comment, setComment] = useState(existing?.comment ?? '');

  function close() {
    if (router.canGoBack()) router.back();
    else router.replace('/finance');
  }

  async function handleSave() {
    const parsedAmount = parseFloat(amount.replace(',', '.'));
    if (!parsedAmount || parsedAmount <= 0) {
      Alert.alert(tr.expenseEditor.invalidAmountTitle, tr.expenseEditor.invalidAmountMessage);
      return;
    }
    if (!categoryId) {
      Alert.alert(tr.expenseEditor.missingCategoryTitle, tr.expenseEditor.missingCategoryMessage);
      return;
    }

    if (isEditing && existing) {
      await editExpense({ ...existing, amount: parsedAmount, categoryId, date, comment: comment || null });
    } else {
      await addExpense({ amount: parsedAmount, categoryId, date, comment: comment || null });
    }
    close();
  }

  function handleDelete() {
    if (!existing) return;
    Alert.alert(tr.expenseEditor.deleteConfirmTitle, undefined, [
      { text: tr.expenseEditor.deleteConfirmCancel, style: 'cancel' },
      {
        text: tr.expenseEditor.deleteConfirmOk,
        style: 'destructive',
        onPress: async () => {
          await removeExpense(existing.id);
          close();
        },
      },
    ]);
  }

  return (
    <Screen>
    <ScrollView
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 32 }]}
    >
      <Text style={[styles.header, { color: theme.colors.text }]}>
        {isEditing ? tr.expenseEditor.headerEdit : tr.expenseEditor.headerNew}
      </Text>

      <TextField label={tr.expenseEditor.amountLabel} value={amount} onChangeText={setAmount} placeholder="0" keyboardType="decimal-pad" />
      <CategoryPicker categories={categories} value={categoryId} onChange={setCategoryId} />
      <TextField
        label={tr.expenseEditor.dateLabel}
        value={date}
        onChangeText={setDate}
        placeholder={todayKey()}
        keyboardType="numbers-and-punctuation"
      />
      <TextField label={tr.expenseEditor.commentLabel} value={comment} onChangeText={setComment} placeholder={tr.expenseEditor.commentPlaceholder} />

      <Button title={tr.expenseEditor.save} onPress={handleSave} style={styles.saveButton} />
      <Button title={tr.expenseEditor.cancel} variant="secondary" onPress={close} />
      {isEditing ? <Button title={tr.expenseEditor.delete} variant="danger" onPress={handleDelete} style={styles.saveButton} /> : null}
    </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, gap: 16 },
  header: { fontSize: 20, fontWeight: '700' },
  saveButton: { marginTop: 4 },
});
