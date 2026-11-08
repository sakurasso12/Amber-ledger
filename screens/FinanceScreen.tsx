import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedRef } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { addMonths, endOfMonth, startOfMonth } from 'date-fns';
import { Text } from '@/components/ui/Text';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { useFinanceStore, usePrimaryAccount, useSpendingExpenses } from '@/store/useFinanceStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { BoardModule, CustomizableCard, EditLayoutButton, EmptyState, Fab, HiddenModulesButton, LayoutScreen, ModuleBoard, ModuleSize, ProgressBar, QuickAddBar, useHiddenBoardItems } from '@/components/ui';
import { LayoutScrollContext } from '@/components/ui/LayoutEditing';
import { useFinanceLocked } from '@/store/useFinanceLock';
import { BalanceCard } from '@/components/finance/BalanceCard';
import { PendingList } from '@/components/finance/PendingList';
import { BudgetBar, BudgetFormDialog } from '@/components/finance/BudgetBar';
import { FinanceMenuBody, FinanceMenuHeader } from '@/components/finance/FinanceMenu';
import { WorkCalendar } from '@/components/finance/WorkCalendar';
import { ExpenseListItem } from '@/components/finance/ExpenseListItem';
import { formatRangeLabel, monthRange, toDateKey, todayKey, weekRange } from '@/lib/dateRanges';
import { payrollState } from '@/lib/earnings';
import { syncCheckReminder, syncLoanReminders, syncSalaryReminder } from '@/notifications';
import { totalExpenses } from '@/lib/expenses';
import { balanceOf, committedUntil, nextPayday, spentFrom } from '@/lib/ledger';
import { pendingItems } from '@/lib/pending';
import { useTranslation } from '@/i18n';
import { FinanceLockGate } from '@/components/finance/FinanceLockGate';
import { AccountCard, AccountFormDialog } from '@/components/finance/AccountCard';
import { LoanCard, LoanFormDialog } from '@/components/finance/LoanCard';
import { MAX_LOANS } from '@/lib/loans';
import { MoneyDialog } from '@/components/finance/MoneyDialog';
import { AccountPicker } from '@/components/finance/AccountPicker';
import { Button, Chip } from '@/components/ui';
import { accountName, expenseCurrency, isSpendable, MAX_CARDS, MAX_GOALS, MAX_STASHES } from '@/lib/accounts';
import { AccountKind, Expense } from '@/types';

export function FinanceScreen() {
  const theme = useTheme();
  const tr = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollRef = useAnimatedRef<Animated.FlatList<Expense>>();
  const settings = useSettingsStore((s) => s.settings);
  const updateSettings = useSettingsStore((s) => s.updateSettings);
  const expenses = useFinanceStore((s) => s.expenses);
  const categories = useFinanceStore((s) => s.categories);
  const workDays = useFinanceStore((s) => s.workDays);
  const accounts = useFinanceStore((s) => s.accounts);
  const transfers = useFinanceStore((s) => s.transfers);
  const incomes = useFinanceStore((s) => s.incomes);
  const adjustments = useFinanceStore((s) => s.adjustments);
  const upcoming = useFinanceStore((s) => s.upcoming);
  const loans = useFinanceStore((s) => s.loans);
  const primary = usePrimaryAccount();
  const pid = primary?.id ?? '';
  const spending = useSpendingExpenses();
  const addExpense = useFinanceStore((s) => s.addExpense);
  const updateAccount = useFinanceStore((s) => s.updateAccount);
  const setAccountBalance = useFinanceStore((s) => s.setAccountBalance);
  const [quickAddOpen, setQuickAddOpen] = useState(false);

  // Quick-add defaults to whatever category was used most recently, falling back to the first one.
  const defaultQuickAddCategoryId = expenses[0]?.categoryId ?? categories[0]?.id ?? null;

  function quickAddExpense(amountText: string) {
    const amount = parseFloat(amountText.replace(',', '.'));
    if (!defaultQuickAddCategoryId || !Number.isFinite(amount) || amount <= 0) return;
    addExpense({ amount, categoryId: defaultQuickAddCategoryId, date: todayKey(), comment: null, accountId: pid || null });
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
  const salaryDue = payroll.due && (!snoozedUntil || snoozedUntil <= now) ? payroll.due : null;
  // "Awaiting answer": salary, loan payments, upcoming payments whose day came, the weekly check.
  const pending = useMemo(
    () => pendingItems({ salaryDue, upcoming, loans, accounts, settings, now }),
    [salaryDue, upcoming, loans, accounts, settings, now]
  );

  useEffect(() => {
    syncSalaryReminder(payroll, settings);
  }, [payroll.due?.key, payroll.awaiting[0]?.key, settings.salaryPromptSnoozedUntil, settings.paydayDay, settings.language]);

  // The main card: the sum of its records (finance v2), and what's already spoken for until payday.
  const today = toDateKey(now);
  const ledger = useMemo(() => ({ expenses, incomes, adjustments, transfers }), [expenses, incomes, adjustments, transfers]);
  const bank = useMemo(() => (pid ? balanceOf(pid, ledger, pid, today) : 0), [pid, ledger, today]);
  const monthStart = toDateKey(startOfMonth(now));
  const spentMonth = useMemo(() => (pid ? spentFrom(pid, expenses, pid, monthStart, today) : 0), [pid, expenses, monthStart, today]);
  const payday = nextPayday(settings, today);
  const committed = useMemo(
    () => (pid ? committedUntil({ accountId: pid, primaryId: pid, expenses, upcoming, loans, categories, spending, until: payday, today }) : []),
    [pid, expenses, upcoming, loans, categories, spending, payday, today]
  );
  const paydayLabel = new Date(`${payday}T12:00:00`).toLocaleDateString(tr.localeCode, { day: 'numeric', month: 'short' });

  async function handleEditBank(real: number | null, bankName: string) {
    if (!primary) return;
    if (bankName !== primary.name) await updateAccount({ ...primary, name: bankName });
    if (real !== null) await setAccountBalance(primary.id, real);
  }

  // Edit mode → "+": a new card (up to MAX_CARDS with the main one) or cash wallet.
  const [addOpen, setAddOpen] = useState(false);
  const [newKind, setNewKind] = useState<AccountKind | null>(null);
  const [newLoan, setNewLoan] = useState(false);
  const [newBudget, setNewBudget] = useState(false);
  const countOf = (kind: AccountKind) => accounts.filter((a) => a.kind === kind).length;
  // With a second card or cash wallet, ask once which one the salary goes to.
  const askSalaryAccount = !settings.salaryAccountAsked && accounts.filter(isSpendable).length > 1;
  // Each kind has its own limit; past it the chip just says so.
  const addChoices: { label: string; full: boolean; limit: string; open: () => void }[] = [
    { label: tr.accounts.addCard, full: countOf('card') >= MAX_CARDS, limit: tr.accounts.cardsLimit(MAX_CARDS), open: () => setNewKind('card') },
    { label: tr.accounts.addCash, full: false, limit: '', open: () => setNewKind('cash') },
    { label: tr.accounts.addStash, full: countOf('stash') >= MAX_STASHES, limit: tr.accounts.stashesLimit(MAX_STASHES), open: () => setNewKind('stash') },
    { label: tr.accounts.addGoal, full: countOf('goal') >= MAX_GOALS, limit: tr.accounts.goalsLimit(MAX_GOALS), open: () => setNewKind('goal') },
    { label: tr.accounts.addSavings, full: false, limit: '', open: () => setNewKind('savings') },
    { label: tr.accounts.addLoan, full: loans.length >= MAX_LOANS, limit: tr.accounts.loansLimit(MAX_LOANS), open: () => setNewLoan(true) },
    { label: `📊 ${tr.money.newBudget}`, full: categories.every((c) => !!c.limitMonth), limit: '', open: () => setNewBudget(true) },
  ];

  // A reminder LOAN_REMINDER_DAYS before every loan payment.
  useEffect(() => {
    syncLoanReminders(loans, settings);
  }, [loans, settings.notificationsEnabled, settings.language]);
  // The weekly balance check's evening reminder.
  useEffect(() => {
    syncCheckReminder(settings);
  }, [settings.reconcileWeekday, settings.notificationsEnabled, settings.language]);
  const [salaryPick, setSalaryPick] = useState(settings.salaryAccountId || pid);

  // Spent = what was bought: plan purchases count, not a plan's whole limit.
  const spentThisWeek = useMemo(() => totalExpenses(spending, weekRange(new Date())), [spending]);
  const spentThisMonth = useMemo(() => totalExpenses(spending, monthRange(new Date())), [spending]);
  const hasBudgetLimits = !!settings.budgetLimitWeek || !!settings.budgetLimitMonth;

  const expenseMode = theme.layout.expenses;

  const renderExpense = (expense: (typeof expenses)[number], variant: 'row' | 'big') => (
    <ExpenseListItem
      key={expense.id}
      expense={expense}
      category={categoryById.get(expense.categoryId)}
      currency={expenseCurrency(expense, accounts, settings.currency)}
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
      title: tr.layoutEdit.modules.balance,
      sizes: ['full'],
      render: () => (
        <BalanceCard
          name={primary?.name ?? ''}
          balance={bank}
          spentMonth={spentMonth}
          committed={committed}
          paydayLabel={paydayLabel}
          onEdit={handleEditBank}
          awaiting={awaitingTotal}
          awaitingLabel={awaitingLabel}
          accruing={payroll.accruing.amount}
          accruingLabel={formatRangeLabel(payroll.accruing.range, tr.localeCode)}
          currency={primary?.currency ?? settings.currency}
          categories={categories}
        />
      ),
    },
    // The other cards, cash wallets, stashes, goals and savings, each its own widget (a goal's bar needs the full width).
    ...accounts
      .filter((account) => !account.isPrimary)
      .map((account) => ({
        key: `account-${account.id}`,
        title: accountName(account, tr.accounts),
        sizes: (account.kind === 'goal' ? ['full'] : ['half', 'full']) as ModuleSize[],
        render: (size: ModuleSize) => <AccountCard account={account} compact={size === 'half'} disabled={editingLayout} />,
      })),
    ...loans.map((loan) => ({
      key: `loan-${loan.id}`,
      title: loan.name || tr.loans.title,
      sizes: ['full'] as ModuleSize[],
      render: () => <LoanCard loan={loan} disabled={editingLayout} />,
    })),
    { key: 'spend-week', title: tr.layoutEdit.modules.spendWeek, sizes: ['half'], render: () => spendTile('spend-week', tr.notificationsContent.perWeek, spentThisWeek) },
    { key: 'spend-month', title: tr.layoutEdit.modules.spendMonth, sizes: ['half'], render: () => spendTile('spend-month', tr.notificationsContent.perMonth, spentThisMonth) },
    // Category budgets (finance v2 — what spending plans became): one bar each, full width.
    ...categories
      .filter((c) => !!c.limitMonth)
      .map((category) => ({
        key: `budget-${category.id}`,
        title: category.name,
        sizes: ['full'] as ModuleSize[],
        render: () => <BudgetBar category={category} disabled={editingLayout} />,
      })),
    ...(hasBudgetLimits ? [{ key: 'budget', title: tr.layoutEdit.modules.budget, sizes: ['full', 'half'] as ModuleSize[], render: budgetCard }] : []),
    {
      key: 'work-calendar',
      title: tr.layoutEdit.modules.workCalendar,
      sizes: ['full'],
      render: () => (
        <CustomizableCard widgetId="finance-work-calendar">
          <WorkCalendar />
        </CustomizableCard>
      ),
    },
  ];

  // ⋮ while editing: widgets removed from this screen.
  const removedItems = useHiddenBoardItems('finance', modules);

  // The list shows one month — this one by default; ‹ › go back through the history. Nothing is
  // deleted on the 1st: every expense stays in Calendar and Stats, and balances don't move.
  const [monthOffset, setMonthOffset] = useState(0);
  const shownMonth = startOfMonth(addMonths(now, monthOffset));
  const shownStart = toDateKey(shownMonth);
  const shownEnd = toDateKey(endOfMonth(shownMonth));
  const monthExpenses = useMemo(() => expenses.filter((e) => e.date >= shownStart && e.date <= shownEnd), [expenses, shownStart, shownEnd]);
  const monthName = shownMonth.toLocaleDateString(tr.localeCode, { month: 'long', year: 'numeric' });
  function showListInfo() {
    const nextClear = startOfMonth(addMonths(now, 1)).toLocaleDateString(tr.localeCode, { day: 'numeric', month: 'long' });
    Alert.alert(tr.financeScreen.listInfoTitle, tr.financeScreen.listInfo(nextClear));
  }

  const listHeader = (
          <View style={styles.topSection}>
            <PendingList items={pending} />
            {askSalaryAccount ? (
              <CustomizableCard widgetId="finance-salary-account" style={styles.askCard}>
                <Text style={[styles.sectionTitle, styles.askTitle, { color: theme.colors.text }]}>{tr.accounts.salaryQuestion}</Text>
                <Text style={{ color: theme.colors.textMuted, fontSize: 12, lineHeight: 17 }}>{tr.accounts.salaryHint}</Text>
                <AccountPicker label="" value={salaryPick} onChange={setSalaryPick} />
                <Button
                  title={tr.accounts.save}
                  onPress={() => updateSettings({ salaryAccountId: salaryPick, salaryAccountAsked: true })}
                />
              </CustomizableCard>
            ) : null}
            <FinanceMenuBody />
            <ModuleBoard boardId="finance" modules={modules} editing={editingLayout} />
            <View style={styles.sectionRow}>
              <Text
                style={[
                  styles.sectionTitle,
                  { color: theme.colors.text, flex: 1 },
                  expenseMode === 'big' && styles.bigSectionTitle,
                ]}
              >
                {monthOffset === 0
                  ? expenseMode === 'big'
                    ? tr.layoutText.expenses.toUpperCase()
                    : tr.financeScreen.recentExpenses
                  : monthName}
              </Text>
              <Pressable onPress={() => setMonthOffset((m) => m - 1)} hitSlop={10} accessibilityLabel="‹">
                <Ionicons name="chevron-back" size={20} color={theme.colors.textMuted} />
              </Pressable>
              <Pressable onPress={() => setMonthOffset((m) => Math.min(0, m + 1))} hitSlop={10} disabled={monthOffset === 0} accessibilityLabel="›">
                <Ionicons name="chevron-forward" size={20} color={monthOffset === 0 ? theme.colors.border : theme.colors.textMuted} />
              </Pressable>
              <Pressable onPress={showListInfo} hitSlop={10} accessibilityLabel={tr.financeScreen.listInfoTitle}>
                <Ionicons name="information-circle-outline" size={20} color={theme.colors.textMuted} />
              </Pressable>
            </View>
          </View>
  );

  return (
    <LayoutScreen
      title={tr.financeScreen.header}
      right={
        <View style={styles.headerRight}>
          <FinanceMenuHeader />
          {editingLayout ? (
            <Pressable onPress={() => setAddOpen(true)} hitSlop={10} accessibilityLabel={tr.accounts.addWidget}>
              <Ionicons name="add-circle-outline" size={24} color={theme.colors.primary} />
            </Pressable>
          ) : null}
          {editingLayout ? <HiddenModulesButton items={removedItems} /> : null}
          <EditLayoutButton editing={editingLayout} onToggle={() => setEditingLayout((v) => !v)} disabled={locked} />
        </View>
      }
    >
      <FinanceLockGate clearRail>
      <LayoutScrollContext.Provider value={scrollRef}>
      <Animated.FlatList
        ref={scrollRef}
        data={monthExpenses}
        keyExtractor={(expense) => expense.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={listHeader}
        renderItem={({ item }) => renderExpense(item, expenseMode === 'big' ? 'big' : 'row')}
        ItemSeparatorComponent={() => <View style={{ height: expenseMode === 'big' ? 12 : 8 }} />}
        ListEmptyComponent={<EmptyState icon="💰" title={tr.financeScreen.emptyTitle} subtitle={tr.financeScreen.emptySubtitle} />}
      />
      </LayoutScrollContext.Provider>

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

      <MoneyDialog visible={addOpen} onClose={() => setAddOpen(false)} title={tr.accounts.addTitle}>
        <View style={styles.addRow}>
          {addChoices.map((choice) => (
            <Chip
              key={choice.label}
              label={choice.label}
              onPress={() => {
                if (choice.full) {
                  Alert.alert(choice.limit);
                  return;
                }
                setAddOpen(false);
                choice.open();
              }}
            />
          ))}
        </View>
      </MoneyDialog>
      <AccountFormDialog visible={newKind !== null} kind={newKind ?? 'card'} onClose={() => setNewKind(null)} />
      <LoanFormDialog visible={newLoan} onClose={() => setNewLoan(false)} />
      <BudgetFormDialog visible={newBudget} onClose={() => setNewBudget(false)} />
    </LayoutScreen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { paddingHorizontal: 16, paddingBottom: 96 },
  topSection: { gap: 14, marginBottom: 14 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginTop: 4 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  budgetTitle: { marginTop: 0, marginBottom: 2 },
  budgetRow: { gap: 6, marginTop: 8 },
  budgetLabelRow: { flexDirection: 'row', justifyContent: 'space-between' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  tileCard: { gap: 4 },
  budgetLabelStack: { gap: 2 },
  statLabel: { fontSize: 12, fontWeight: '700', textTransform: 'capitalize' },
  statValue: { fontSize: 24, fontWeight: '800' },
  askCard: { gap: 10 },
  askTitle: { marginTop: 0 },
  addRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  bigSectionTitle: { fontSize: 34, fontWeight: '800', letterSpacing: 2, marginTop: 12 },
});
