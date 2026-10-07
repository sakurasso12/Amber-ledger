import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { useTaskStore } from '@/store/useTaskStore';
import { useFinanceStore } from '@/store/useFinanceStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { CustomizableCard, LayoutScreen, SegmentedControl } from '@/components/ui';
import { cardSurface } from '@/theme/surfaces';
import { BarChart } from '@/components/charts/BarChart';
import { CategoryBreakdownBars } from '@/components/charts/CategoryBreakdownBars';
import { lastNWeeks, monthRange } from '@/lib/dateRanges';
import { weeklyTaskStats } from '@/lib/taskStats';
import { earningsForRanges } from '@/lib/earnings';
import { categoryBreakdown, topCategory } from '@/lib/expenses';
import { useTranslation } from '@/i18n';
import { categoryLabel } from '@/lib/categoryLabel';

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

  // This week at a glance — shown as tiles (Bento), a line list (Feed) or one giant number (Vertical).
  const thisWeek = taskStats[taskStats.length - 1];
  const earnedThisWeek = earningsWeekly[earningsWeekly.length - 1]?.amount ?? 0;
  const spentThisMonth = breakdown.reduce((sum, e) => sum + e.total, 0);
  const figures =
    tab === 'tasks'
      ? [
          { label: tr.stats.completedPerWeek, value: String(thisWeek?.completed ?? 0), color: theme.colors.success },
          { label: tr.stats.createdPerWeek, value: String(thisWeek?.created ?? 0), color: theme.colors.accent },
          { label: tr.stats.overduePerWeek, value: String(thisWeek?.overdue ?? 0), color: theme.colors.danger },
        ]
      : [
          { label: tr.stats.earningsPerWeek, value: `${earnedThisWeek.toFixed(0)} ${settings.currency}`, color: theme.colors.success },
          { label: tr.stats.expensesByCategory, value: `${spentThisMonth.toFixed(0)} ${settings.currency}`, color: theme.colors.danger },
        ];
  const statsMode = theme.layout.stats;
  let summary: React.ReactNode = null;
  if (statsMode === 'tiles') {
    summary = (
      <View style={styles.tilesRow}>
        {figures.map((f) => (
          <View key={f.label} style={[styles.tile, cardSurface(theme)]}>
            <Text style={[styles.tileValue, { color: f.color }]} numberOfLines={1} adjustsFontSizeToFit>
              {f.value}
            </Text>
            <Text style={[styles.tileLabel, { color: theme.colors.textMuted }]} numberOfLines={2}>
              {f.label}
            </Text>
          </View>
        ))}
      </View>
    );
  } else if (statsMode === 'list') {
    summary = (
      <View>
        {figures.map((f) => (
          <View key={f.label} style={[styles.listRow, { borderBottomColor: theme.colors.border }]}>
            <Text style={[styles.listLabel, { color: theme.colors.text }]}>{f.label}</Text>
            <Text style={[styles.listValue, { color: f.color }]}>{f.value}</Text>
          </View>
        ))}
      </View>
    );
  } else if (statsMode === 'big') {
    summary = (
      <View style={styles.bigWrap}>
        <Text style={[styles.bigValue, { color: figures[0].color }]} numberOfLines={1} adjustsFontSizeToFit>
          {figures[0].value}
        </Text>
        <Text style={[styles.bigLabel, { color: theme.colors.textMuted }]}>{figures[0].label}</Text>
      </View>
    );
  }

  return (
    <LayoutScreen title={tr.stats.header}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}>

      <SegmentedControl<Tab>
        value={tab}
        onChange={setTab}
        segments={[
          { value: 'tasks', label: tr.stats.tasksTab },
          { value: 'finance', label: tr.stats.financeTab },
        ]}
      />

      {summary}

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
                <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>{tr.stats.topCategory} {categoryLabel({ id: top.categoryId, name: top.categoryName }, tr)}</Text>
              ) : null}
            </View>
            <CategoryBreakdownBars entries={breakdown} currency={settings.currency} />
          </CustomizableCard>
        </>
      )}
      </ScrollView>
    </LayoutScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 4, gap: 16 },
  tilesRow: { flexDirection: 'row', gap: 10 },
  tile: { flex: 1, padding: 12, gap: 4, minHeight: 92 },
  tileValue: { fontSize: 26, fontWeight: '800' },
  tileLabel: { fontSize: 11, fontWeight: '600' },
  listRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  listLabel: { fontSize: 15, flexShrink: 1, marginRight: 10 },
  listValue: { fontSize: 20, fontWeight: '800' },
  bigWrap: { alignItems: 'center', paddingVertical: 10 },
  bigValue: { fontSize: 88, fontWeight: '800', lineHeight: 92 },
  bigLabel: { fontSize: 14, fontWeight: '700', textAlign: 'center' },
  card: { gap: 12 },
  cardTitle: { fontSize: 15, fontWeight: '700' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
