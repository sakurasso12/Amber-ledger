import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { useFinanceStore } from '@/store/useFinanceStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { BoardModule, CustomizableCard, EditLayoutButton, EmptyState, Fab, LayoutScreen, ModuleBoard, ModuleSize, ProgressBar, QuickAddBar } from '@/components/ui';
import { useFinanceLocked } from '@/store/useFinanceLock';
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
import { FinanceLockGate } from '@/components/finance/FinanceLockGate';
import { SavingsCard } from '@/components/finance/SavingsCard';

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

  const expenseMode = theme.layout.expenses;

  const renderExpense = (expense: (typeof expenses)[number], variant: 'row' | 'big') => (
    <ExpenseListItem
      key={expense.id}
      expense={expense}
      category={categoryById.get(expense.categoryId)}
      currency={settings.currency}
      onPress={() => router.push(`/expense/${expense.id}`)}
      variant={variant}
    />
  );

  const [editingLayout, setEditingLayout] = useState(false);
  const locked = useFinanceLocked();
  // Nothing to rearrange behind the lock — and leaving edit mode when it locks.
  useEffect(() => {
    if (locked) setEditingLayout(false);
  }, [locked]);

  const spendTile = (key: string, label: string, value: number) => (
    <CustomizableCard widgetId={`finance-${key}`} style={styles.tileCard}>
      <Text style={[styles.statLabel, { color: theme.colors.textMuted }]}>{label}</Text>
      <Text style={[styles.statValue, { color: theme.colors.text }]} numberOfLines={1} adjustsFontSizeToFit>
        -{value.toFixed(0)} {settings.currency}
      </Text>
    </CustomizableCard>
  );

  // Half-width budget stacks each label over its numbers so nothing gets squeezed.
  const budgetCard = (size: ModuleSize) => {
    const row = (label: string, spent: number, limit: number) => (
      <View style={styles.budgetRow}>
        <View style={size === 'half' ? styles.budgetLabelStack : styles.budgetLabelRow}>
          <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>{label}</Text>
          <Text style={{ color: theme.colors.text, fontSize: 12, fontWeight: '700' }} numberOfLines={1} adjustsFontSizeToFit>
            {spent.toFixed(0)} / {limit.toFixed(0)} {settings.currency}
          </Text>
        </View>
        <ProgressBar ratio={spent / limit} color={theme.colors.success} />
      </View>
    );
    return (
      <CustomizableCard widgetId="finance-budget">
        <Text style={[styles.sectionTitle, styles.budgetTitle, { color: theme.colors.text }]}>{tr.financeScreen.budgetTitle}</Text>
        {settings.budgetLimitWeek ? row(tr.notificationsContent.perWeek, spentThisWeek, settings.budgetLimitWeek) : null}
        {settings.budgetLimitMonth ? row(tr.notificationsContent.perMonth, spentThisMonth, settings.budgetLimitMonth) : null}
      </CustomizableCard>
    );
  };

  // The cards above the expenses, in the user's own order and sizes (pencil → edit).
  const modules: BoardModule[] = [
    {
      key: 'balance',
      sizes: ['full'],
      render: () => (
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
      ),
    },
    { key: 'spend-week', sizes: ['half'], render: () => spendTile('spend-week', tr.notificationsContent.perWeek, spentThisWeek) },
    { key: 'spend-month', sizes: ['half'], render: () => spendTile('spend-month', tr.notificationsContent.perMonth, spentThisMonth) },
    ...(hasBudgetLimits ? [{ key: 'budget', sizes: ['full', 'half'] as ModuleSize[], render: budgetCard }] : []),
    {
      key: 'work-calendar',
      sizes: ['full'],
      render: () => (
        <CustomizableCard widgetId="finance-work-calendar">
          <WorkCalendar />
        </CustomizableCard>
      ),
    },
    ...(settings.savingsCard === 'off'
      ? []
      : [
          {
            key: 'savings',
            // The opt-in question needs the full width; the card itself also fits in half.
            sizes: (settings.savingsCard === 'ask' ? ['full'] : ['full', 'half']) as ModuleSize[],
            render: (size: ModuleSize) => <SavingsCard compact={size === 'half'} />,
          },
        ]),
  ];

  const listHeader = (
          <View style={styles.topSection}>
            {showSalaryPrompt && payroll.due ? <SalaryPrompt due={payroll.due} currency={settings.currency} /> : null}
            <FinanceMenuBody />
            <ModuleBoard boardId="finance" modules={modules} editing={editingLayout} />
            <Text
              style={[
                styles.sectionTitle,
                { color: theme.colors.text },
                expenseMode === 'big' && styles.bigSectionTitle,
              ]}
            >
              {expenseMode === 'big' ? tr.layoutText.expenses.toUpperCase() : tr.financeScreen.recentExpenses}
            </Text>
          </View>
  );

  return (
    <LayoutScreen
      title={tr.financeScreen.header}
      right={
        <View style={styles.headerRight}>
          <FinanceMenuHeader />
          <EditLayoutButton editing={editingLayout} onToggle={() => setEditingLayout((v) => !v)} disabled={locked} />
        </View>
      }
    >
      <FinanceLockGate clearRail>
      <FlatList
        data={expenses}
        keyExtractor={(expense) => expense.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={listHeader}
        renderItem={({ item }) => renderExpense(item, expenseMode === 'big' ? 'big' : 'row')}
        ItemSeparatorComponent={() => <View style={{ height: expenseMode === 'big' ? 12 : 8 }} />}
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

      {editingLayout ? null : (
        <Fab
          onPress={() => router.push('/expense/new')}
          onLongPress={() => defaultQuickAddCategoryId && setQuickAddOpen(true)}
          bottom={insets.bottom + 16}
        />
      )}
      </FinanceLockGate>
    </LayoutScreen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { paddingHorizontal: 16, paddingBottom: 96 },
  topSection: { gap: 14, marginBottom: 14 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginTop: 4 },
  budgetTitle: { marginTop: 0, marginBottom: 2 },
  budgetRow: { gap: 6, marginTop: 8 },
  budgetLabelRow: { flexDirection: 'row', justifyContent: 'space-between' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  tileCard: { gap: 4 },
  budgetLabelStack: { gap: 2 },
  statLabel: { fontSize: 12, fontWeight: '700', textTransform: 'capitalize' },
  statValue: { fontSize: 24, fontWeight: '800' },
  bigSectionTitle: { fontSize: 34, fontWeight: '800', letterSpacing: 2, marginTop: 12 },
});
