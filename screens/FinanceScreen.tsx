import React, { useEffect, useMemo, useState } from 'react';
import { Alert, AppState, Pressable, StyleSheet, View, ScrollView, useWindowDimensions } from 'react-native';
import Animated, { useAnimatedRef } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { addMonths, endOfMonth, startOfMonth } from 'date-fns';
import { Text } from '@/components/ui/Text';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { useFinanceStore, usePrimaryAccount, useSpendingExpenses } from '@/store/useFinanceStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { CustomizableCard, EditLayoutButton, EmptyState, Fab, GridBoard, GridModule, MIN_HALF, MIN_WIDE, HiddenModulesButton, LayoutScreen, ModuleSize, ProgressBar, QuickAddBar, useHiddenBoardItems } from '@/components/ui';
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
import { syncCheckReminder, syncLoanReminders, syncSalaryReminder, syncSubscriptionReminders } from '@/notifications';
import { totalExpenses } from '@/lib/expenses';
import { balanceOf, committedUntil, nextPayday, spentFrom } from '@/lib/ledger';
import { pendingItems } from '@/lib/pending';
import { BANK_FEATURE, bankAccessGranted, bankAvailable, openBankAccessSettings, pullBankTransactions } from '@/lib/bank/sync';
import { useTranslation } from '@/i18n';
import { FinanceLockGate } from '@/components/finance/FinanceLockGate';
import { AccountCard, AccountFormDialog } from '@/components/finance/AccountCard';
import { LoanCard, LoanFormDialog } from '@/components/finance/LoanCard';
import { MAX_LOANS } from '@/lib/loans';
import { MoneyDialog } from '@/components/finance/MoneyDialog';
import { AccountPicker } from '@/components/finance/AccountPicker';
import { Button, Chip } from '@/components/ui';
import { dueIncomes, upcomingIncomes } from '@/lib/incomes';
import { accountName, expenseCurrency, isSpendable, MAX_CARDS, MAX_GOALS, MAX_STASHES, primaryId as primaryIdOf } from '@/lib/accounts';
import { AccountKind, Expense } from '@/types';
import { fmtAmount } from '@/lib/money';
import { GridCellContext } from '@/components/ui/GridCell';
import { BigActions } from '@/components/ui/BigActions';
import { TextField } from '@/components/ui/TextField';
import { haptics } from '@/lib/haptics';

export function FinanceScreen() {
  const theme = useTheme();
  const simpleMode = useSettingsStore((st) => st.settings.uiMode === 'simple');
  const tr = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
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
  // Personal build: IKO notifications → "Awaiting answer" (pulled on open and when the app comes back).
  const [bankAccess, setBankAccess] = useState(() => bankAccessGranted());
  useEffect(() => {
    if (!BANK_FEATURE) return;
    const sync = () => {
      setBankAccess(bankAccessGranted());
      pullBankTransactions();
    };
    sync();
    const sub = AppState.addEventListener('change', (s) => s === 'active' && sync());
    return () => sub.remove();
  }, []);
  // Only one number from the store (not the whole store): re-render only when the card balance changes.
  const bankPid = primaryIdOf(accounts);
  const appCardBalance = useFinanceStore((s) => (BANK_FEATURE && bankPid ? balanceOf(bankPid, s, bankPid) : 0));
  const bankBalance = useMemo(() => {
    const bank = settings.bankLastBalance;
    if (!BANK_FEATURE || bank === null || !bankPid || settings.bankBalanceDismissed === bank) return null;
    return { accountId: bankPid, bank, app: appCardBalance };
  }, [settings.bankLastBalance, settings.bankBalanceDismissed, bankPid, appCardBalance]);
  const pending = useMemo(
    () =>
      pendingItems({
        salaryDue,
        incomeDue: dueIncomes(settings.incomeSources ?? [], incomes, now),
        upcoming,
        loans,
        accounts,
        settings,
        now,
        bank: settings.bankPending,
        bankBalance,
      }),
    [salaryDue, incomes, upcoming, loans, accounts, settings, now, bankBalance]
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
  // 1.7: subscriptions — the morning before each charge, with Тимофій's purr if that's on.
  useEffect(() => {
    syncSubscriptionReminders(upcoming, settings, settings.currency);
  }, [upcoming, settings.subscriptionIds, settings.subscriptionReminders, settings.purrNotifications, settings.notificationsEnabled, settings.language, settings.currency]);
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
  const [incomeOpen, setIncomeOpen] = useState(false);
  const locked = useFinanceLocked();
  // Nothing to rearrange behind the lock — and leaving edit mode when it locks.
  useEffect(() => {
    if (locked) setEditingLayout(false);
  }, [locked]);

  const spendTile = (key: string, label: string, value: number) => (
    <CustomizableCard widgetId={`finance-${key}`} style={[styles.tileCard, styles.flex]}>
      <Text style={[styles.statLabel, { color: theme.colors.textMuted }]}>{label}</Text>
      <Text style={[styles.statValue, { color: theme.colors.text }]} numberOfLines={1} adjustsFontSizeToFit>
        -{fmtAmount(value)} {settings.currency}
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
            {fmtAmount(spent)} / {fmtAmount(limit)} {settings.currency}
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
  const modules: GridModule[] = [
    {
      key: 'balance',
      title: tr.layoutEdit.modules.balance,
      sizes: ['full'],
      minWidth: MIN_WIDE + 10,
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
        // The ⋮ list of removed widgets names the KIND (Card, Cash…), not the user's own label.
        title: tr.accounts[account.kind],
        sizes: (account.kind === 'goal' ? ['full'] : ['half', 'full']) as ModuleSize[],
        minWidth: account.kind === 'goal' ? MIN_WIDE : MIN_HALF,
        render: (size: ModuleSize) => <AccountCard account={account} compact={size === 'half'} disabled={editingLayout} />,
      })),
    ...loans.map((loan) => ({
      key: `loan-${loan.id}`,
      title: tr.loans.title,
      sizes: ['full'] as ModuleSize[],
      minWidth: MIN_WIDE,
      render: () => <LoanCard loan={loan} disabled={editingLayout} />,
    })),
    // Week and month as one small column: two equal tiles, one over the other.
    {
      key: 'spend',
      title: `${tr.layoutEdit.modules.spendWeek} · ${tr.layoutEdit.modules.spendMonth}`,
      sizes: ['half'],
      minWidth: MIN_HALF,
      render: () => (
        <TileStack>
          {spendTile('spend-week', tr.notificationsContent.perWeek, spentThisWeek)}
          {spendTile('spend-month', tr.notificationsContent.perMonth, spentThisMonth)}
        </TileStack>
      ),
    },
    // Category budgets (finance v2 — what spending plans became): one bar each, full width.
    ...categories
      .filter((c) => !!c.limitMonth)
      .map((category) => ({
        key: `budget-${category.id}`,
        title: tr.layoutEdit.modules.budget,
        sizes: ['full'] as ModuleSize[],
        minWidth: MIN_WIDE,
        render: () => <BudgetBar category={category} disabled={editingLayout} />,
      })),
    ...(hasBudgetLimits ? [{ key: 'budget', title: tr.layoutEdit.modules.budget, sizes: ['full', 'half'] as ModuleSize[], minWidth: MIN_HALF, render: budgetCard }] : []),
    {
      key: 'work-calendar',
      title: tr.layoutEdit.modules.workCalendar,
      sizes: ['full'],
      minWidth: MIN_WIDE,
      render: () => (
        <CustomizableCard widgetId="finance-work-calendar">
          <WorkCalendar />
        </CustomizableCard>
      ),
    },
    {
      key: 'expenses',
      title: tr.financeScreen.recentExpenses,
      sizes: ['full'],
      minWidth: MIN_WIDE,
      resizableHeight: { min: 260, max: 900, initial: 460 },
      render: () => expensesBlock,
    },
  ];

  // Phone: the 1.7 arrangement — week and month as two half tiles side by side, and the expenses as a
  // plain list under the board (the grid's list block and the stacked tiles are for wide screens).
  const { width: screenWidth } = useWindowDimensions();
  const narrow = screenWidth < 600;
  const boardModules: GridModule[] = narrow
    ? modules.flatMap((m) =>
        m.key === 'spend'
          ? [
              { key: 'spend-week', title: tr.layoutEdit.modules.spendWeek, sizes: ['half'] as ModuleSize[], render: () => spendTile('spend-week', tr.notificationsContent.perWeek, spentThisWeek) },
              { key: 'spend-month', title: tr.layoutEdit.modules.spendMonth, sizes: ['half'] as ModuleSize[], render: () => spendTile('spend-month', tr.notificationsContent.perMonth, spentThisMonth) },
            ]
          : m.key === 'expenses'
            ? []
            : [m]
      )
    : modules;

  // ⋮ while editing: widgets removed from this screen.
  const removedItems = useHiddenBoardItems('finance', boardModules);

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

  // The month's expenses as ONE widget on the grid (2.0): a block whose height is dragged within
  // limits, the list scrolling inside it — not a card per expense.
  const expensesHeader = (
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
  );
  const expensesItems = (
    <>
        {monthExpenses.length === 0 ? (
          <EmptyState icon="💰" title={tr.financeScreen.emptyTitle} subtitle={tr.financeScreen.emptySubtitle} />
        ) : (
          monthExpenses.map((e) => (
            <View key={e.id} style={{ marginBottom: expenseMode === 'big' ? 12 : 8 }}>
              {renderExpense(e, expenseMode === 'big' ? 'big' : 'row')}
            </View>
          ))
        )}
    </>
  );
  const expensesBlock = (
    <View style={[styles.expensesBlock, { borderColor: theme.colors.border, backgroundColor: `${theme.colors.surface}66` }]}>
      {expensesHeader}
      <ScrollView style={styles.flex} contentContainerStyle={styles.expensesList} nestedScrollEnabled>
        {expensesItems}
      </ScrollView>
    </View>
  );

  // The nearest pension / fixed salary still to come this month.
  const nextIncome = useMemo(() => upcomingIncomes(settings.incomeSources ?? [], now)[0] ?? null, [settings.incomeSources, now]);

  // Simple mode (1.8), as in the mock-up: what needs an answer, one big card with the money
  // (main card large, other cards and cash below, the next income), then the latest expenses.
  const otherAccounts = accounts.filter((a) => a.id !== pid && isSpendable(a));
  const money = (n: number, cur: string) => `${fmtAmount(n)} ${cur}`;
  const simpleBody = (
    <View style={styles.simpleWrap}>
      <PendingList items={pending} />
      <View style={[styles.simpleCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <Text style={[styles.simpleLabel, { color: theme.colors.textMuted }]}>{tr.uiMode.onCard}{primary?.name ? ` · ${primary.name}` : ''}</Text>
        <Text style={[styles.simpleBig, { color: theme.colors.text }]} numberOfLines={1} adjustsFontSizeToFit>
          {money(bank, primary?.currency ?? settings.currency)}
        </Text>
        {otherAccounts.map((a) => (
          <Text key={a.id} style={[styles.simpleLine, { color: theme.colors.textMuted }]}>
            {accountName(a, tr.accounts)}: {money(balanceOf(a.id, ledger, pid, today), a.currency)}
          </Text>
        ))}
        <Text style={[styles.simpleLine, { color: theme.colors.textMuted }]}>{tr.uiMode.spentMonth(money(spentThisMonth, settings.currency))}</Text>
        {nextIncome ? (
          <View style={[styles.soon, { backgroundColor: `${theme.colors.success}1A`, borderColor: `${theme.colors.success}55` }]}>
            <Ionicons name="heart-outline" size={20} color={theme.colors.success} />
            <Text style={[styles.soonText, { color: theme.colors.text }]}>
              {tr.incomes.soon(
                nextIncome.advance ? tr.incomes.advanceOf(nextIncome.source.name) : nextIncome.source.name,
                new Date(`${nextIncome.date}T12:00:00`).toLocaleDateString(tr.localeCode, { day: 'numeric', month: 'long' }),
                money(nextIncome.amount, settings.currency)
              )}
            </Text>
          </View>
        ) : null}
      </View>
      <View style={[styles.simpleCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <Text style={[styles.simpleSection, { color: theme.colors.textMuted }]}>{tr.financeScreen.recentExpenses}</Text>
        {expensesItems}
      </View>
    </View>
  );


  const listHeader = (
          <View style={styles.topSection}>
            {BANK_FEATURE && !bankAccess && bankAvailable() ? (
              <View style={[styles.bankAccess, { borderColor: theme.colors.accent }]}>
                <Text style={{ color: theme.colors.text, fontWeight: '700' }}>💳 {tr.bank.accessTitle}</Text>
                <Text style={{ color: theme.colors.textMuted, fontSize: 12, lineHeight: 17 }}>{tr.bank.accessHint}</Text>
                <Button title={tr.bank.accessButton} onPress={openBankAccessSettings} />
              </View>
            ) : null}
            <PendingList items={pending} />
            {nextIncome ? (
              <View style={[styles.soon, { backgroundColor: `${theme.colors.success}1A`, borderColor: `${theme.colors.success}55` }]}>
                <Ionicons name="heart-outline" size={20} color={theme.colors.success} />
                <Text style={[styles.soonText, { color: theme.colors.text }]}>
                  {tr.incomes.soon(
                    nextIncome.advance ? tr.incomes.advanceOf(nextIncome.source.name) : nextIncome.source.name,
                    new Date(`${nextIncome.date}T12:00:00`).toLocaleDateString(tr.localeCode, { day: 'numeric', month: 'long' }),
                    `${fmtAmount(nextIncome.amount)} ${settings.currency}`
                  )}
                </Text>
              </View>
            ) : null}
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
            <GridBoard boardId="finance" modules={boardModules} editing={editingLayout} />
            {narrow ? (
              <View style={styles.phoneExpenses}>
                {expensesHeader}
                {expensesItems}
              </View>
            ) : null}
          </View>
  );

  return (
    <LayoutScreen
      title={simpleMode ? tr.uiMode.tabMoney : tr.financeScreen.header}
      help="finance"
      right={
        <View style={styles.headerRight}>
          <FinanceMenuHeader />
          {editingLayout ? (
            <Pressable onPress={() => setAddOpen(true)} hitSlop={10} accessibilityLabel={tr.accounts.addWidget}>
              <Ionicons name="add-circle-outline" size={24} color={theme.colors.primary} />
            </Pressable>
          ) : null}
          {/* Simple mode has no pencil: the removed widgets come back from here. */}
          {editingLayout || (simpleMode && removedItems.length > 0) ? <HiddenModulesButton items={removedItems} /> : null}
          <EditLayoutButton helpId="finance.edit" editing={editingLayout} onToggle={() => setEditingLayout((v) => !v)} disabled={locked} />
        </View>
      }
    >
      <FinanceLockGate clearRail>
      <LayoutScrollContext.Provider value={scrollRef}>
      <Animated.ScrollView ref={scrollRef} contentContainerStyle={styles.listContent} keyboardShouldPersistTaps="handled">
        {simpleMode ? simpleBody : listHeader}
      </Animated.ScrollView>
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

      {editingLayout ? null : simpleMode ? (
        // Simple mode: two big, labelled buttons instead of a bare "+".
        <BigActions
          bottom={insets.bottom + 16}
          actions={[
            { label: tr.uiMode.expense, icon: 'remove', color: theme.colors.danger, onPress: () => router.push('/expense/new') },
            { label: tr.uiMode.income, icon: 'add', color: theme.colors.success, onPress: () => setIncomeOpen(true) },
          ]}
        />
      ) : (
        <Fab
          helpId="finance.fab"
          onPress={() => router.push('/expense/new')}
          onLongPress={() => defaultQuickAddCategoryId && setQuickAddOpen(true)}
          bottom={insets.bottom + 16}
        />
      )}
      <IncomeDialog visible={incomeOpen} onClose={() => setIncomeOpen(false)} />
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
  bankAccess: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 8, marginBottom: 10 },
  container: { flex: 1 },
  listContent: { paddingHorizontal: 16, paddingBottom: 96 },
  topSection: { gap: 14, marginBottom: 14 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginTop: 4 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  spendStack: { gap: 12 },
  simpleWrap: { gap: 14, paddingBottom: 100 },
  simpleCard: { borderWidth: 1, borderRadius: 18, padding: 18, gap: 8 },
  simpleLabel: { fontSize: 16, fontWeight: '600' },
  simpleBig: { fontSize: 40, fontWeight: '800' },
  simpleLine: { fontSize: 15 },
  simpleSection: { fontSize: 14, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.6 },
  phoneExpenses: { gap: 8, marginTop: 6 },
  incomeButtons: { flexDirection: 'row', gap: 8 },
  spendSlot: { flex: 1 },
  soon: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 14, padding: 12 },
  soonText: { flex: 1, fontSize: 14, fontWeight: '600' },
  expensesBlock: { flex: 1, borderWidth: 1, borderRadius: 18, padding: 12, gap: 10, overflow: 'hidden' },
  expensesList: { paddingBottom: 4 },
  flex: { flex: 1 },
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

/** Two tiles one over the other that share the widget's grid box (the row's height) equally. */
function TileStack({ children }: { children: React.ReactNode[] }) {
  const height = React.useContext(GridCellContext);
  return (
    <GridCellContext.Provider value={null}>
      <View style={[styles.spendStack, height ? { height } : null]}>
        {children.map((child, i) => (
          <View key={i} style={styles.spendSlot}>
            {child}
          </View>
        ))}
      </View>
    </GridCellContext.Provider>
  );
}

/** Simple mode's "+ Income": an amount and where it went — recorded as received today. */
function IncomeDialog({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const tr = useTranslation();
  const currency = useSettingsStore((s) => s.settings.currency);
  const accounts = useFinanceStore((s) => s.accounts);
  const addIncome = useFinanceStore((s) => s.addIncome);
  const [amount, setAmount] = useState('');
  const [accountId, setAccountId] = useState(primaryIdOf(accounts));
  const n = parseFloat(amount.replace(',', '.').replace(/\s/g, ''));
  async function save() {
    if (!(n > 0)) return;
    await addIncome(Math.round(n * 100) / 100, accountId, todayKey());
    haptics.success();
    setAmount('');
    onClose();
  }
  return (
    <MoneyDialog visible={visible} onClose={onClose} title={tr.uiMode.incomeTitle}>
      <TextField label={tr.money.amountLabel(currency)} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0" autoFocus />
      <AccountPicker label={tr.incomes.account} value={accountId} onChange={setAccountId} />
      <View style={styles.incomeButtons}>
        <Button title={tr.uiMode.cancel} variant="secondary" onPress={onClose} style={styles.flex} />
        <Button title={tr.uiMode.incomeSave} onPress={save} disabled={!(n > 0)} style={styles.flex} />
      </View>
    </MoneyDialog>
  );
}
