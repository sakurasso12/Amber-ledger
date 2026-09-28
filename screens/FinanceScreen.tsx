import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { useFinanceStore } from '@/store/useFinanceStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { CustomizableCard, EmptyState, ProgressBar, QuickAddBar, Screen } from '@/components/ui';
import { BalanceCard } from '@/components/finance/BalanceCard';
import { WorkCalendar } from '@/components/finance/WorkCalendar';
import { ExpenseListItem } from '@/components/finance/ExpenseListItem';
import {
  formatRangeLabel,
  formatShortDate,
  monthRange,
  mostRecentMonthlyDay,
  payPeriodRange,
  toDateKey,
  todayKey,
  weekRange,
} from '@/lib/dateRanges';
import { totalEarnings } from '@/lib/earnings';
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

  // "Банк" — manually-set cash on hand, auto-reduced by every expense logged since it was set.
  const { bank, spentSinceSet } = useMemo(
    () => computeBankBalance(expenses, settings.bankBalanceBase, settings.bankBalanceSetAt),
    [expenses, settings.bankBalanceBase, settings.bankBalanceSetAt]
  );
  // Editing the Bank number is the real-world "payday happened" moment — it also dismisses the
  // payday reminder banner below, until the next one comes around.
  function handleEditBank(newBase: number) {
    const now = new Date().toISOString();
    updateSettings({ bankBalanceBase: newBase, bankBalanceSetAt: now, lastSettledAt: todayKey() });
  }

  // "Должно прийти" — earnings within the current pay period (Settings → Заработок → период).
  const currentPeriod = useMemo(() => payPeriodRange(new Date(), settings.payPeriodStartDay), [settings.payPeriodStartDay]);
  const incoming = useMemo(() => totalEarnings(workDays, settings, currentPeriod), [workDays, settings, currentPeriod]);
  const incomingLabel = useMemo(() => formatRangeLabel(currentPeriod, tr.localeCode), [currentPeriod, tr.localeCode]);

  // Reminder banner: has a payday passed since the last settlement?
  const lastPayday = useMemo(() => mostRecentMonthlyDay(new Date(), settings.paydayDay), [settings.paydayDay]);
  const paydayKey = useMemo(() => toDateKey(lastPayday), [lastPayday]);
  const showPaydayBanner = !settings.lastSettledAt || paydayKey > settings.lastSettledAt;

  const spentThisWeek = useMemo(() => totalExpenses(expenses, weekRange(new Date())), [expenses]);
  const spentThisMonth = useMemo(() => totalExpenses(expenses, monthRange(new Date())), [expenses]);
  const hasBudgetLimits = !!settings.budgetLimitWeek || !!settings.budgetLimitMonth;

  return (
    <Screen style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.headerRow}>
        <Text style={[styles.header, { color: theme.colors.text }]}>{tr.financeScreen.header}</Text>
        <View style={styles.headerLinks}>
          <Pressable onPress={() => router.push('/expense/recurring')}>
            <Text style={{ color: theme.colors.accent, fontWeight: '600', fontSize: 13 }}>{tr.financeScreen.recurringLink}</Text>
          </Pressable>
          <Pressable onPress={() => router.push('/expense/planned')}>
            <Text style={{ color: theme.colors.accent, fontWeight: '600', fontSize: 13 }}>{tr.financeScreen.plannedLink}</Text>
          </Pressable>
          <Pressable onPress={() => router.push('/category/manage')}>
            <Text style={{ color: theme.colors.accent, fontWeight: '600', fontSize: 13 }}>{tr.financeScreen.categoriesLink}</Text>
          </Pressable>
        </View>
      </View>

      <FlatList
        data={expenses}
        keyExtractor={(e) => e.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.topSection}>
            {showPaydayBanner ? (
              <View style={[styles.banner, { backgroundColor: `${theme.colors.accent}26`, borderColor: theme.colors.accent }]}>
                <Text style={[styles.bannerText, { color: theme.colors.text }]}>
                  💰 {tr.financeScreen.paydayBanner} ({formatShortDate(lastPayday, tr.localeCode)})
                </Text>
              </View>
            ) : null}
            <BalanceCard
              bank={bank}
              spentSinceSet={spentSinceSet}
              onEditBank={handleEditBank}
              incoming={incoming}
              incomingLabel={incomingLabel}
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
        style={[styles.fab, { backgroundColor: theme.colors.primary, bottom: insets.bottom + 16 }]}
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
  headerLinks: { flexDirection: 'row', gap: 14 },
  header: { fontSize: 26, fontWeight: '700' },
  listContent: { paddingHorizontal: 16, paddingBottom: 96 },
  topSection: { gap: 14, marginBottom: 14 },
  banner: { borderRadius: 14, borderWidth: 1, padding: 12 },
  bannerText: { fontSize: 13, fontWeight: '600', lineHeight: 18 },
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
