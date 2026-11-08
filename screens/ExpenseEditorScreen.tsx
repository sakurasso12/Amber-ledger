import React, { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/Text';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { useFinanceStore } from '@/store/useFinanceStore';
import { Button, DateField, Screen, TextField } from '@/components/ui';
import { CategoryPicker } from '@/components/finance/CategoryPicker';
import { AccountPicker, useAccountOptions } from '@/components/finance/AccountPicker';
import { primaryId } from '@/lib/accounts';
import { addExpenseAsking, editExpenseAsking, removeExpenseAsking } from '@/components/finance/balanceQuestion';
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
  const accounts = useFinanceStore((s) => s.accounts);

  const existing = useMemo(() => expenses.find((e) => e.id === params.id), [expenses, params.id]);
  const isEditing = !!existing;

  const [amount, setAmount] = useState(existing ? String(existing.amount) : '');
  const [categoryId, setCategoryId] = useState(existing?.categoryId ?? categories[0]?.id ?? '');
  const [date, setDate] = useState(existing?.date ?? todayKey());
  const [comment, setComment] = useState(existing?.comment ?? '');
  // Card or cash it's paid from — only asked once there's more than the main card.
  const accountOptions = useAccountOptions();
  const pid = primaryId(accounts);
  const [accountId, setAccountId] = useState(existing?.accountId ?? pid);
  const currency = accountOptions.find((o) => o.id === accountId)?.currency ?? accountOptions[0]?.currency ?? '';

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
    // Dated before the last balance check / logged before it: asks "was it already in?" first.
    if (isEditing && existing) {
      await editExpenseAsking({ ...existing, amount: parsedAmount, categoryId, date, comment: comment || null, accountId: accountId || null });
    } else {
      await addExpenseAsking({ amount: parsedAmount, categoryId, date, comment: comment || null, accountId: accountId || null });
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
          await removeExpenseAsking(existing.id);
          close();
        },
      },
    ]);
  }

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.header, { color: theme.colors.text }]}>
          {isEditing ? tr.expenseEditor.headerEdit : tr.expenseEditor.headerNew}
        </Text>
        {accountOptions.length > 1 ? <AccountPicker label={tr.accounts.payFrom} value={accountId} onChange={setAccountId} /> : null}
        <TextField
          label={`${tr.expenseEditor.amountLabel} (${currency})`}
          value={amount}
          onChangeText={setAmount}
          placeholder="0"
          keyboardType="decimal-pad"
        />
        <CategoryPicker categories={categories} value={categoryId} onChange={setCategoryId} />
        <DateField label={tr.expenseEditor.dateLabel} value={date} onChange={setDate} />
        <TextField
          label={tr.expenseEditor.commentLabel}
          value={comment}
          onChangeText={setComment}
          placeholder={tr.expenseEditor.commentPlaceholder}
        />

        <Button title={tr.expenseEditor.save} onPress={handleSave} style={styles.saveButton} />
        <Button title={tr.expenseEditor.cancel} variant="secondary" onPress={close} />
        {isEditing ? <Button title={tr.expenseEditor.delete} variant="danger" onPress={handleDelete} style={styles.saveButton} /> : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, gap: 16, width: '100%', maxWidth: 720, alignSelf: 'center' },
  header: { fontSize: 20, fontWeight: '700' },
  saveButton: { marginTop: 4 },
  planRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  planText: { flex: 1, gap: 3 },
  planNote: { fontSize: 14, lineHeight: 20 },
});
