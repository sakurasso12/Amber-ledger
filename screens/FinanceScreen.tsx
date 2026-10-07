import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { fabShape } from '@/theme/surfaces';
import { useFinanceStore } from '@/store/useFinanceStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { CustomizableCard, EmptyState, ProgressBar, QuickAddBar, Screen } from '@/components/ui';
import { BalanceCard } from '@/components/finance/BalanceCard';
import { SalaryPrompt } from '@/components/finance/SalaryPrompt';
import { FinanceMenuBody, FinanceMenuHeader } from '@/components/finance/FinanceMenu';
import { WorkCalendar } from '@/components/finance/WorkCalendar';
import { ExpenseListItem } from '@/components/finance/ExpenseListItem';
import { formatRangeLabel, monthRange, todayKey, weekRange } from '@/lib/dateRanges';
import { payrollState } from '@/lib/earnings';
import { syncSalaryReminder } from '@/notifications';
import { computeBankBalance, totalExpenses } from '@/lib/expenses';
import { useTranslation } from '@/i18n';

export function FinanceScreen() {
  const theme = useTheme();
  const tr = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const settings = useSettingsStore((s) => s.settings);
  const updateSettings = useSettingsStore((s) => s.updateSettings);
  const expenses = useFinanceStore((s) => s.expenses);
  const categories = useFinanceStore((s) => s.categories);
  const workDays = useFinanceStore((s) => s.workDays);
  const plannedExpenses = useFinanceStore((s) => s.plannedExpenses);
  const addExpense = useFinanceStore((s) => s.addExpense);
  const plannedTotal = useMemo(() => plannedExpenses.reduce((sum, p) => sum + p.amount, 0), [plannedExpenses]);
  const [quickAddOpen, setQuickAddOpen] = useState(false);

  // Quick-add defaults to whatever category was used most recently, falling back to the first one.
  const defaultQuickAddCategoryId = expenses[0]?.categoryId ?? categories[0]?.id ?? null;

  function quickAddExpense(amountText: string) {
    const amount = parseFloat(amountText.replace(',', '.'));
    if (!defaultQuickAddCategoryId || !Number.isFinite(amount) || amount <= 0) return;
    addExpense({ amount, categoryId: defaultQuickAddCategoryId, date: todayKey(), comment: null });
  }

  const categoryById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  // Re-evaluated every minute so the salary prompt appears on payday / after a snooze ends
  // even if the app stays open.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  // Closed periods wait in "Должно прийти" until their salary is confirmed; the current one accrues.
  const payroll = useMemo(() => payrollState(workDays, settings, now), [workDays, settings, now]);
  const awaitingTotal = payroll.awaiting.reduce((sum, p) => sum + p.amount, 0);
  const awaitingLabel =
    payroll.awaiting.length > 0
      ? formatRangeLabel(
          { start: payroll.awaiting[0].period.start, end: payroll.awaiting[payroll.awaiting.length - 1].period.end },
          tr.localeCode
        )
      : null;

  const snoozedUntil = settings.salaryPromptSnoozedUntil ? new Date(settings.salaryPromptSnoozedUntil) : null;
  const showSalaryPrompt = !!payroll.due && (!snoozedUntil || snoozedUntil <= now);

  useEffect(() => {
    syncSalaryReminder(payroll, settings);
  }, [payroll.due?.key, payroll.awaiting[0]?.key, settings.salaryPromptSnoozedUntil, settings.paydayDay, settings.language]);

  // "Банк" — manually-set cash on hand, minus every expense logged since it was set, plus every
  // salary confirmed since then.
  const { bank: bankBeforeSalary, spentSinceSet } = useMemo(
    () => computeBankBalance(expenses, settings.bankBalanceBase, settings.bankBalanceSetAt),
    [expenses, settings.bankBalanceBase, settings.bankBalanceSetAt]
  );
  const bank = bankBeforeSalary + payroll.creditedSinceSet;

  function handleEditBank(newBase: number) {
    const setAt = new Date().toISOString();
    updateSettings({ bankBalanceBase: newBase, bankBalanceSetAt: setAt, lastSettledAt: todayKey() });
  }

  const spentThisWeek = useMemo(() => totalExpenses(expenses, weekRange(new Date())), [expenses]);
  const spentThisMonth = useMemo(() => totalExpenses(expenses, monthRange(new Date())), [expenses]);
  const hasBudgetLimits = !!settings.budgetLimitWeek || !!settings.budgetLimitMonth;

  return (
    <Screen style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.headerRow}>
        <Text style={[styles.header, { color: theme.colors.text }]}>{tr.financeScreen.header}</Text>
        <FinanceMenuHeader currency={settings.currency} />
      </View>

      <FlatList
        data={expenses}
        keyExtractor={(e) => e.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.topSection}>
            {showSalaryPrompt && payroll.due ? <SalaryPrompt due={payroll.due} currency={settings.currency} /> : null}
            <FinanceMenuBody currency={settings.currency} />
            <BalanceCard
              bank={bank}
              spentSinceSet={spentSinceSet}
              creditedSinceSet={payroll.creditedSinceSet}
              onEditBank={handleEditBank}
              awaiting={awaitingTotal}
              awaitingLabel={awaitingLabel}
              accruing={payroll.accruing.amount}
              accruingLabel={formatRangeLabel(payroll.accruing.range, tr.localeCode)}
              plannedTotal={plannedTotal}
              currency={settings.currency}
            />
            {hasBudgetLimits ? (
              <CustomizableCard widgetId="finance-budget">
                <Text style={[styles.sectionTitle, styles.budgetTitle, { color: theme.colors.text }]}>
                  {tr.financeScreen.budgetTitle}
                </Text>
                {settings.budgetLimitWeek ? (
                  <View style={styles.budgetRow}>
                    <View style={styles.budgetLabelRow}>
                      <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>{tr.notificationsContent.perWeek}</Text>
                      <Text style={{ color: theme.colors.text, fontSize: 12, fontWeight: '700' }}>
                        {spentThisWeek.toFixed(0)} / {settings.budgetLimitWeek.toFixed(0)} {settings.currency}
                      </Text>
                    </View>
                    <ProgressBar ratio={spentThisWeek / settings.budgetLimitWeek} color={theme.colors.success} />
                  </View>
                ) : null}
                {settings.budgetLimitMonth ? (
                  <View style={styles.budgetRow}>
                    <View style={styles.budgetLabelRow}>
                      <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>{tr.notificationsContent.perMonth}</Text>
                      <Text style={{ color: theme.colors.text, fontSize: 12, fontWeight: '700' }}>
                        {spentThisMonth.toFixed(0)} / {settings.budgetLimitMonth.toFixed(0)} {settings.currency}
                      </Text>
                    </View>
                    <ProgressBar ratio={spentThisMonth / settings.budgetLimitMonth} color={theme.colors.success} />
                  </View>
                ) : null}
              </CustomizableCard>
            ) : null}
            <CustomizableCard widgetId="finance-work-calendar">
              <WorkCalendar />
            </CustomizableCard>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{tr.financeScreen.recentExpenses}</Text>
          </View>
        }
        renderItem={({ item }) => (
          <ExpenseListItem
            expense={item}
            category={categoryById.get(item.categoryId)}
            currency={settings.currency}
            onPress={() => router.push(`/expense/${item.id}`)}
          />
        )}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        ListEmptyComponent={<EmptyState icon="💰" title={tr.financeScreen.emptyTitle} subtitle={tr.financeScreen.emptySubtitle} />}
      />

      {quickAddOpen ? (
        <QuickAddBar
          placeholder={`${tr.expenseEditor.amountLabel} (${settings.currency})`}
          keyboardType="decimal-pad"
          onSubmit={quickAddExpense}
          onClose={() => setQuickAddOpen(false)}
          style={{ bottom: insets.bottom + 82 }}
        />
      ) : null}

      <Pressable
        onPress={() => router.push('/expense/new')}
        onLongPress={() => defaultQuickAddCategoryId && setQuickAddOpen(true)}
        style={[styles.fab, { backgroundColor: theme.colors.primary, bottom: insets.bottom + 16 }, fabShape(theme)]}
      >
        <Text style={{ color: theme.colors.primaryText, fontSize: 26, lineHeight: 28 }}>+</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  header: { fontSize: 26, fontWeight: '700' },
  listContent: { paddingHorizontal: 16, paddingBottom: 96 },
  topSection: { gap: 14, marginBottom: 14 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginTop: 4 },
  budgetTitle: { marginTop: 0, marginBottom: 2 },
  budgetRow: { gap: 6, marginTop: 8 },
  budgetLabelRow: { flexDirection: 'row', justifyContent: 'space-between' },
  fab: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
});
