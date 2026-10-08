import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Sortable from 'react-native-sortables';
import { Text } from '@/components/ui/Text';
import { addMonths } from 'date-fns';
import { useTheme } from '@/theme/ThemeProvider';
import { useTaskStore } from '@/store/useTaskStore';
import { useFinanceStore } from '@/store/useFinanceStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { CustomizableCard, EditLayoutButton, EmptyState, LayoutScreen } from '@/components/ui';
import { LayoutEditItem } from '@/components/ui/LayoutEditItem';
import { useFinanceLocked } from '@/store/useFinanceLock';
import { TaskListItem } from '@/components/task/TaskListItem';
import { ExpenseListItem } from '@/components/finance/ExpenseListItem';
import { MonthCalendar, DayMarker } from '@/components/calendar/MonthCalendar';
import { toDateKey, todayKey } from '@/lib/dateRanges';
import { priorityColor } from '@/theme/theme';
import { useTranslation } from '@/i18n';

export function CalendarScreen() {
  const theme = useTheme();
  const tr = useTranslation();
  const router = useRouter();
  const tasks = useTaskStore((s) => s.tasks);
  const setStatus = useTaskStore((s) => s.setStatus);
  const expenses = useFinanceStore((s) => s.expenses);
  const categories = useFinanceStore((s) => s.categories);
  const currency = useSettingsStore((s) => s.settings.currency);
  const categoryById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  const [month, setMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(todayKey());

  const markers = useMemo(() => {
    const result: Record<string, DayMarker> = {};
    const ensure = (key: string) => (result[key] ??= { taskColors: [], hasExpense: false });

    for (const task of tasks) {
      // Completed tasks disappear from the calendar too, like from the task list.
      if (!task.deadlineAt || task.status === 'done') continue;
      const marker = ensure(toDateKey(new Date(task.deadlineAt)));
      const color = priorityColor(theme, task.priority);
      if (!marker.taskColors.includes(color)) marker.taskColors.push(color);
    }
    for (const expense of expenses) {
      ensure(expense.date).hasExpense = true;
    }
    return result;
  }, [tasks, expenses, theme]);

  const tasksForDay = useMemo(
    () =>
      tasks
        .filter((t) => t.status !== 'done' && t.deadlineAt && toDateKey(new Date(t.deadlineAt)) === selectedDate)
        .sort((a, b) => (a.deadlineAt ?? '').localeCompare(b.deadlineAt ?? '')),
    [tasks, selectedDate]
  );
  // The day's expenses in the order the user dragged them into (new ones on top), per day.
  const dayOrders = useSettingsStore((s) => s.settings.expenseDayOrder);
  const updateSettings = useSettingsStore((s) => s.updateSettings);
  const expensesForDay = useMemo(() => {
    const rank = new Map((dayOrders[selectedDate] ?? []).map((id, i) => [id, i]));
    const day = expenses.filter((e) => e.date === selectedDate);
    return [...day.filter((e) => !rank.has(e.id)), ...day.filter((e) => rank.has(e.id)).sort((a, b) => rank.get(a.id)! - rank.get(b.id)!)];
  }, [expenses, selectedDate, dayOrders]);

  // Only the expenses can be rearranged here (pencil); nothing to do while finances are locked.
  const [editing, setEditing] = useState(false);
  const [drops, setDrops] = useState<Record<string, number>>({});
  const locked = useFinanceLocked();
  useEffect(() => {
    if (locked || expensesForDay.length < 2) setEditing(false);
  }, [locked, expensesForDay.length]);
  const itemCount = tasksForDay.length + expensesForDay.length;

  const monthLabel = month.toLocaleDateString(tr.localeCode, { month: 'long', year: 'numeric' });
  const selectedDateObj = new Date(`${selectedDate}T12:00:00`);
  // Day items follow the layout: big cards in Vertical, plain rows otherwise.
  const dayMode = theme.layout.expenses;

  return (
    <LayoutScreen
      title={tr.calendarScreen.header}
      count={itemCount}
      right={
        expensesForDay.length > 1 ? (
          <EditLayoutButton editing={editing} onToggle={() => setEditing((v) => !v)} disabled={locked} />
        ) : undefined
      }
    >

      <View style={styles.calendarWrapper}>
        <CustomizableCard widgetId="calendar-month">
          <View style={styles.monthNav}>
            <Pressable onPress={() => setMonth((m) => addMonths(m, -1))} hitSlop={8}>
              <Text style={[styles.navArrow, { color: theme.colors.primary }]}>‹</Text>
            </Pressable>
            <Text style={[styles.monthLabel, { color: theme.colors.text }]}>{monthLabel}</Text>
            <Pressable onPress={() => setMonth((m) => addMonths(m, 1))} hitSlop={8}>
              <Text style={[styles.navArrow, { color: theme.colors.primary }]}>›</Text>
            </Pressable>
          </View>
          <MonthCalendar month={month} markers={markers} selectedDate={selectedDate} onSelectDate={setSelectedDate} />
        </CustomizableCard>
      </View>

      <ScrollView contentContainerStyle={styles.listContent}>
        {theme.layout.tasks === 'focus' ? (
          // Vertical: the selected day as a big date heading above its items.
          <View style={styles.dayHero}>
            <Text style={[styles.dayHeroNumber, { color: theme.colors.primary }]}>{selectedDateObj.getDate()}</Text>
            <View>
              <Text style={[styles.dayHeroWeekday, { color: theme.colors.text }]}>
                {selectedDateObj.toLocaleDateString(tr.localeCode, { weekday: 'long' })}
              </Text>
              <Text style={[styles.dayHeroMonth, { color: theme.colors.textMuted }]}>
                {selectedDateObj.toLocaleDateString(tr.localeCode, { month: 'long', year: 'numeric' })}
              </Text>
            </View>
          </View>
        ) : null}

        {itemCount === 0 ? <EmptyState icon="🗓️" title={tr.calendarScreen.emptyDay} /> : null}

        <View style={styles.items}>
          {tasksForDay.map((task) => (
            <TaskListItem key={task.id} task={task} onCycleStatus={setStatus} />
          ))}
        </View>

        {expensesForDay.length > 0 ? (
          <Sortable.Flex
            flexDirection="column"
            rowGap={8}
            sortEnabled={editing}
            dragActivationDelay={150}
            activeItemScale={0.95}
            activeItemShadowOpacity={0.25}
            inactiveItemOpacity={1}
            hapticsEnabled
            onDragEnd={({ order }) =>
              updateSettings({ expenseDayOrder: { ...dayOrders, [selectedDate]: order(expensesForDay).map((e) => e.id) } })
            }
            onActiveItemDropped={({ key }) => setDrops((d) => ({ ...d, [key]: (d[key] ?? 0) + 1 }))}
          >
            {expensesForDay.map((expense) => (
              <View key={expense.id}>
                <LayoutEditItem dropCount={drops[expense.id] ?? 0}>
                  <View pointerEvents={editing ? 'none' : 'auto'}>
                    <ExpenseListItem
                      expense={expense}
                      category={categoryById.get(expense.categoryId)}
                      currency={currency}
                      onPress={() => router.push(`/expense/${expense.id}`)}
                      variant={dayMode === 'big' ? 'big' : 'row'}
                    />
                  </View>
                </LayoutEditItem>
              </View>
            ))}
          </Sortable.Flex>
        ) : null}
      </ScrollView>
    </LayoutScreen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  dayHero: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 8, marginBottom: 6 },
  dayHeroNumber: { fontSize: 56, fontWeight: '800', lineHeight: 60 },
  dayHeroWeekday: { fontSize: 18, fontWeight: '800', textTransform: 'capitalize' },
  dayHeroMonth: { fontSize: 13, textTransform: 'capitalize' },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    marginBottom: 8,
  },
  navArrow: { fontSize: 24, fontWeight: '700', paddingHorizontal: 12 },
  monthLabel: { fontSize: 16, fontWeight: '700', textTransform: 'capitalize', minWidth: 160, textAlign: 'center' },
  calendarWrapper: { paddingHorizontal: 12, marginBottom: 12 },
  listContent: { paddingHorizontal: 16, paddingBottom: 32, gap: 8 },
  items: { gap: 8 },
});
