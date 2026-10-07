import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { useTaskStore } from '@/store/useTaskStore';
import { useFinanceStore } from '@/store/useFinanceStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { CustomizableCard, Screen, SegmentedControl } from '@/components/ui';
import { BarChart } from '@/components/charts/BarChart';
import { CategoryBreakdownBars } from '@/components/charts/CategoryBreakdownBars';
import { lastNWeeks, monthRange } from '@/lib/dateRanges';
import { weeklyTaskStats } from '@/lib/taskStats';
import { earningsForRanges } from '@/lib/earnings';
import { categoryBreakdown, topCategory } from '@/lib/expenses';
import { useTranslation } from '@/i18n';

type Tab = 'tasks' | 'finance';

export function StatsScreen() {
  const theme = useTheme();
  const tr = useTranslation();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>('tasks');

  const tasks = useTaskStore((s) => s.tasks);
  const expenses = useFinanceStore((s) => s.expenses);
  const categories = useFinanceStore((s) => s.categories);
  const workDays = useFinanceStore((s) => s.workDays);
  const settings = useSettingsStore((s) => s.settings);

  const weeks = useMemo(() => lastNWeeks(new Date(), 8), []);
  const taskStats = useMemo(() => weeklyTaskStats(tasks, weeks), [tasks, weeks]);
  const earningsWeekly = useMemo(
    () => earningsForRanges(workDays, settings, weeks.map((range, i) => ({ label: taskStats[i].label, range }))),
    [workDays, settings, weeks, taskStats]
  );

  const monthlyRange = useMemo(() => monthRange(new Date()), []);
  const breakdown = useMemo(() => categoryBreakdown(expenses, categories, monthlyRange), [expenses, categories, monthlyRange]);
  const top = useMemo(() => topCategory(expenses, categories, monthlyRange), [expenses, categories, monthlyRange]);

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32 }]}
      >
      <Text style={[styles.header, { color: theme.colors.text }]}>{tr.stats.header}</Text>

      <SegmentedControl<Tab>
        value={tab}
        onChange={setTab}
        segments={[
          { value: 'tasks', label: tr.stats.tasksTab },
          { value: 'finance', label: tr.stats.financeTab },
        ]}
      />

      {tab === 'tasks' ? (
        <>
          <CustomizableCard widgetId="stats-created" style={styles.card}>
            <Text style={[styles.cardTitle, { color: theme.colors.text }]}>{tr.stats.createdPerWeek}</Text>
            <BarChart data={taskStats.map((w) => ({ label: w.label, value: w.created }))} color={theme.colors.accent} />
          </CustomizableCard>
          <CustomizableCard widgetId="stats-completed" style={styles.card}>
            <Text style={[styles.cardTitle, { color: theme.colors.text }]}>{tr.stats.completedPerWeek}</Text>
            <BarChart data={taskStats.map((w) => ({ label: w.label, value: w.completed }))} color={theme.colors.success} />
          </CustomizableCard>
          <CustomizableCard widgetId="stats-overdue" style={styles.card}>
            <Text style={[styles.cardTitle, { color: theme.colors.text }]}>{tr.stats.overduePerWeek}</Text>
            <BarChart data={taskStats.map((w) => ({ label: w.label, value: w.overdue }))} color={theme.colors.danger} />
          </CustomizableCard>
        </>
      ) : (
        <>
          <CustomizableCard widgetId="stats-earnings" style={styles.card}>
            <Text style={[styles.cardTitle, { color: theme.colors.text }]}>{tr.stats.earningsPerWeek}</Text>
            <BarChart
              data={earningsWeekly.map((w) => ({ label: w.label, value: w.amount }))}
              color={theme.colors.success}
              formatValue={(n) => n.toFixed(0)}
            />
          </CustomizableCard>
          <CustomizableCard widgetId="stats-categories" style={styles.card}>
            <View style={styles.rowBetween}>
              <Text style={[styles.cardTitle, { color: theme.colors.text }]}>{tr.stats.expensesByCategory}</Text>
              {top ? (
                <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>{tr.stats.topCategory} {top.categoryName}</Text>
              ) : null}
            </View>
            <CategoryBreakdownBars entries={breakdown} currency={settings.currency} />
          </CustomizableCard>
        </>
      )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, gap: 16 },
  header: { fontSize: 26, fontWeight: '700' },
  card: { gap: 12 },
  cardTitle: { fontSize: 15, fontWeight: '700' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
