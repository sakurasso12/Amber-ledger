import React, { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { useFinanceStore } from '@/store/useFinanceStore';
import { Button, DateField, Screen, TextField } from '@/components/ui';
import { CategoryPicker } from '@/components/finance/CategoryPicker';
import { AccountPicker, useAccountOptions } from '@/components/finance/AccountPicker';
import { accountIdOf, MAIN_ACCOUNT_ID } from '@/lib/accounts';
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
  const createSpendPlan = useFinanceStore((s) => s.createSpendPlan);
  const deleteSpendPlan = useFinanceStore((s) => s.deleteSpendPlan);
  const planExists = useFinanceStore((s) => !!existing?.planId && s.spendPlans.some((p) => p.id === existing.planId));

  const existing = useMemo(() => expenses.find((e) => e.id === params.id), [expenses, params.id]);
  const isEditing = !!existing;

  const [amount, setAmount] = useState(existing ? String(existing.amount) : '');
  const [categoryId, setCategoryId] = useState(existing?.categoryId ?? categories[0]?.id ?? '');
  const [date, setDate] = useState(existing?.date ?? todayKey());
  const [comment, setComment] = useState(existing?.comment ?? '');
  // Card or cash it's paid from — only asked once there's more than the main card.
  const accountOptions = useAccountOptions();
  const [accountId, setAccountId] = useState(existing ? accountIdOf(existing) : MAIN_ACCOUNT_ID);
  const currency = accountOptions.find((o) => o.id === accountId)?.currency ?? accountOptions[0].currency;
  const paidFrom = accountId === MAIN_ACCOUNT_ID ? null : accountId;
  // New planned spending: the amount becomes the plan's limit and the comment its name.
  const [planned, setPlanned] = useState(false);
  // A plan's own records (its limit, its overspend) are managed from its bar, not edited here.
  const planLinked = !!existing?.planRole;

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

    if (planned && !isEditing) {
      if (!comment.trim()) {
        Alert.alert(tr.plans.nameLabel);
        return;
      }
      await createSpendPlan({ name: comment.trim(), categoryId, limit: parsedAmount, date });
    } else if (isEditing && existing) {
      await editExpense({ ...existing, amount: parsedAmount, categoryId, date, comment: comment || null, accountId: paidFrom });
    } else {
      await addExpense({ amount: parsedAmount, categoryId, date, comment: comment || null, accountId: paidFrom });
    }
    close();
  }

  function handleDelete() {
    if (!existing) return;
    // A plan's record: deleting it undoes the whole plan, so all its money comes back.
    if (planExists && existing.planId) {
      const planId = existing.planId;
      Alert.alert(tr.plans.removeTitle, tr.plans.removeText, [
        { text: tr.plans.cancel, style: 'cancel' },
        {
          text: tr.plans.remove,
          style: 'destructive',
          onPress: async () => {
            await deleteSpendPlan(planId);
            close();
          },
        },
      ]);
      return;
    }
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

      {planLinked ? (
        <>
          <Text style={[styles.planNote, { color: existing?.planRole === 'overspend' ? theme.colors.danger : theme.colors.textMuted }]}>
            {existing?.planRole === 'overspend' ? `${tr.plans.overspend} · ` : ''}
            {tr.plans.editorNote}
          </Text>
          <Button title={tr.expenseEditor.cancel} variant="secondary" onPress={close} />
          <Button title={planExists ? tr.plans.remove : tr.expenseEditor.delete} variant="danger" onPress={handleDelete} style={styles.saveButton} />
        </>
      ) : (
        <>
          {isEditing ? null : (
            <View style={[styles.planRow, { borderColor: theme.colors.border }]}>
              <View style={styles.planText}>
                <Text style={{ color: theme.colors.text, fontSize: 15, fontWeight: '600' }}>{tr.plans.toggle}</Text>
                <Text style={{ color: theme.colors.textMuted, fontSize: 12, lineHeight: 17 }}>{tr.plans.toggleHint}</Text>
              </View>
              <Switch
                value={planned}
                onValueChange={setPlanned}
                trackColor={{ true: theme.colors.primary, false: theme.colors.border }}
                thumbColor={theme.colors.surface}
              />
            </View>
          )}
          {/* Plans always come off the main card. */}
          {accountOptions.length > 1 && !planned ? (
            <AccountPicker label={tr.accounts.payFrom} value={accountId} onChange={setAccountId} />
          ) : null}
          <TextField
            label={`${planned ? tr.plans.limitLabel : tr.expenseEditor.amountLabel} (${planned ? accountOptions[0].currency : currency})`}
            value={amount}
            onChangeText={setAmount}
            placeholder="0"
            keyboardType="decimal-pad"
          />
          <CategoryPicker categories={categories} value={categoryId} onChange={setCategoryId} />
          {planned ? null : <DateField label={tr.expenseEditor.dateLabel} value={date} onChange={setDate} />}
          <TextField
            label={planned ? tr.plans.nameLabel : tr.expenseEditor.commentLabel}
            value={comment}
            onChangeText={setComment}
            placeholder={planned ? tr.plans.namePlaceholder : tr.expenseEditor.commentPlaceholder}
          />

          <Button title={tr.expenseEditor.save} onPress={handleSave} style={styles.saveButton} />
          <Button title={tr.expenseEditor.cancel} variant="secondary" onPress={close} />
          {isEditing ? <Button title={tr.expenseEditor.delete} variant="danger" onPress={handleDelete} style={styles.saveButton} /> : null}
        </>
      )}
    </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, gap: 16 },
  header: { fontSize: 20, fontWeight: '700' },
  saveButton: { marginTop: 4 },
  planRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  planText: { flex: 1, gap: 3 },
  planNote: { fontSize: 14, lineHeight: 20 },
});
