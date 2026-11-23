import React, { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { useAnimatedRef } from 'react-native-reanimated';
import { Text } from '@/components/ui/Text';
import { addMonths } from 'date-fns';
import { useTheme } from '@/theme/ThemeProvider';
import { useTaskStore } from '@/store/useTaskStore';
import { useFinanceStore } from '@/store/useFinanceStore';
import { expenseCurrency } from '@/lib/accounts';
import { useSettingsStore } from '@/store/useSettingsStore';
import { CustomizableCard, EditLayoutButton, EmptyState, GridBoard, GridModule, LayoutScreen, MIN_WIDE, SegmentedControl, useAuthPrompt } from '@/components/ui';
import { unlockFinances, useFinanceLocked } from '@/store/useFinanceLock';
import { TaskListItem } from '@/components/task/TaskListItem';
import { ExpenseListItem } from '@/components/finance/ExpenseListItem';
import { MonthCalendar, DayMarker } from '@/components/calendar/MonthCalendar';
import { toDateKey, todayKey } from '@/lib/dateRanges';
import { priorityColor } from '@/theme/theme';
import { useTranslation } from '@/i18n';
import { Expense, Task } from '@/types';
import { fmtAmount } from '@/lib/money';

export function CalendarScreen() {
  const theme = useTheme();
  const tr = useTranslation();
  const router = useRouter();
  const tasks = useTaskStore((s) => s.tasks);
  const setStatus = useTaskStore((s) => s.setStatus);
  const expenses = useFinanceStore((s) => s.expenses);
  const categories = useFinanceStore((s) => s.categories);
  const accounts = useFinanceStore((s) => s.accounts);
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
    // The archive: days something was finished or added on.
    for (const task of tasks) {
      if (task.completedAt) ensure(toDateKey(new Date(task.completedAt))).hasArchive = true;
      if (isAddedByHand(task)) ensure(toDateKey(new Date(task.createdAt))).hasArchive = true;
    }
    return result;
  }, [tasks, expenses, theme]);

  const locked = useFinanceLocked();
  const tasksForDay = useMemo(
    () =>
      tasks
        .filter((t) => t.status !== 'done' && t.deadlineAt && toDateKey(new Date(t.deadlineAt)) === selectedDate)
        .sort((a, b) => (a.deadlineAt ?? '').localeCompare(b.deadlineAt ?? '')),
    [tasks, selectedDate]
  );
  // Archive of the day: what was finished then, and what was added then (still open or not).
  const doneOnDay = useMemo(
    () =>
      tasks
        .filter((t) => t.status === 'done' && t.completedAt && toDateKey(new Date(t.completedAt)) === selectedDate)
        .sort((a, b) => (a.completedAt ?? '').localeCompare(b.completedAt ?? '')),
    [tasks, selectedDate]
  );
  const addedOnDay = useMemo(() => {
    const shown = new Set([...tasksForDay, ...doneOnDay].map((t) => t.id));
    return tasks
      .filter((t) => isAddedByHand(t) && !shown.has(t.id) && toDateKey(new Date(t.createdAt)) === selectedDate)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }, [tasks, selectedDate, tasksForDay, doneOnDay]);

  // Expenses open only after the Finance unlock (fingerprint/PIN or password, as set in Security).
  const { ask, prompt } = useAuthPrompt();
  async function openExpense(id: string) {
    if (locked) {
      if (!(await ask('finance'))) return;
      unlockFinances();
    }
    router.push(`/expense/${id}`);
  }

  // The day's expenses in the order the user dragged them into (new ones on top), per day.
  const dayOrders = useSettingsStore((s) => s.settings.expenseDayOrder);
  const updateSettings = useSettingsStore((s) => s.updateSettings);
  const expensesForDay = useMemo(() => {
    const rank = new Map((dayOrders[selectedDate] ?? []).map((id, i) => [id, i]));
    const day = expenses.filter((e) => e.date === selectedDate);
    return [...day.filter((e) => !rank.has(e.id)), ...day.filter((e) => rank.has(e.id)).sort((a, b) => rank.get(a.id)! - rank.get(b.id)!)];
  }, [expenses, selectedDate, dayOrders]);

  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const itemCount = tasksForDay.length + expensesForDay.length + doneOnDay.length + addedOnDay.length;

  const monthLabel = month.toLocaleDateString(tr.localeCode, { month: 'long', year: 'numeric' });
  const selectedDateObj = new Date(`${selectedDate}T12:00:00`);
  // Day items follow the layout: big cards in Vertical, plain rows otherwise.
  const dayMode = theme.layout.expenses;

  // Two looks: the widget grid (month + selected day) or a week of columns. Older saved values
  // (the dropped "two columns" trial) fall back to the grid.
  // The week of columns needs a wide screen; on a phone it's always the month.
  const { width: screenWidth } = useWindowDimensions();
  const wide = screenWidth >= 600;
  const storedView = useSettingsStore((s) => s.settings.calendarView);
  const view = wide && storedView === 'week' ? 'week' : 'grid';

  const calendarCard = (
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
  );

  const dayHero = (
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
  );

  const expenseRow = (expense: (typeof expensesForDay)[number]) => (
    <ExpenseListItem
      expense={expense}
      category={categoryById.get(expense.categoryId)}
      currency={expenseCurrency(expense, accounts, currency)}
      onPress={() => openExpense(expense.id)}
      variant={dayMode === 'big' ? 'big' : 'row'}
    />
  );

  // The selected day: its tasks, expenses (in the order once dragged into) and the archive —
  // what was finished and added that day.
  const dayItems = () => (
    <>
      {itemCount === 0 ? <EmptyState icon="🗓️" title={tr.calendarScreen.emptyDay} /> : null}
      <View style={styles.items}>
        {tasksForDay.map((task) => (
          <TaskListItem key={task.id} task={task} onCycleStatus={setStatus} />
        ))}
      </View>
      {expensesForDay.length > 0 ? (
        <View style={styles.items}>
          {expensesForDay.map((expense) => (
            <View key={expense.id}>{expenseRow(expense)}</View>
          ))}
        </View>
      ) : null}
      {doneOnDay.length > 0 ? (
        <>
          <Text style={[styles.sectionLabel, { color: theme.colors.textMuted }]}>{tr.calendarScreen.doneSection}</Text>
          <View style={styles.items}>
            {doneOnDay.map((task) => (
              <TaskListItem key={task.id} task={task} onCycleStatus={setStatus} />
            ))}
          </View>
        </>
      ) : null}
      {addedOnDay.length > 0 ? (
        <>
          <Text style={[styles.sectionLabel, { color: theme.colors.textMuted }]}>{tr.calendarScreen.addedSection}</Text>
          <View style={styles.items}>
            {addedOnDay.map((task) => (
              <TaskListItem key={task.id} task={task} onCycleStatus={setStatus} />
            ))}
          </View>
        </>
      ) : null}
    </>
  );

  // A block with the day in it — the grid's "selected day" widget.
  const dayBlock = (
    <View style={[styles.dayBlock, { borderColor: theme.colors.border, backgroundColor: `${theme.colors.surface}66` }]}>
      <Animated.ScrollView ref={scrollRef} style={styles.container} contentContainerStyle={styles.dayBlockContent} nestedScrollEnabled>
        {dayHero}
        {dayItems()}
      </Animated.ScrollView>
    </View>
  );

  const [gridEditing, setGridEditing] = useState(false);
  const modules: GridModule[] = [
    { key: 'calendar-month', title: tr.calendarScreen.monthBlock, sizes: ['full'], minWidth: MIN_WIDE, render: () => calendarCard },
    {
      key: 'calendar-day',
      title: tr.calendarScreen.dayBlock,
      sizes: ['full'],
      minWidth: MIN_WIDE,
      removable: false,
      resizableHeight: { min: 260, max: 1000, initial: 440 },
      render: () => dayBlock,
    },
  ];

  let body: React.ReactNode;
  if (view === 'week') {
    body = (
      <Animated.ScrollView contentContainerStyle={styles.listContent}>
        <WeekView
          anchor={selectedDate}
          tasks={tasks}
          expenses={expenses}
          selectedDate={selectedDate}
          onSelect={setSelectedDate}
          onShift={(days) => {
            const d = new Date(`${selectedDate}T12:00:00`);
            d.setDate(d.getDate() + days);
            setSelectedDate(toDateKey(d));
            setMonth(d);
          }}
          currencyOf={(e) => expenseCurrency(e, accounts, currency)}
        />
        <View style={styles.weekDay}>
          {dayHero}
          {dayItems()}
        </View>
      </Animated.ScrollView>
    );
  } else {
    body = (
      <Animated.ScrollView contentContainerStyle={styles.listContent}>
        <GridBoard boardId="calendar" modules={modules} editing={gridEditing} />
      </Animated.ScrollView>
    );
  }

  return (
    <LayoutScreen
      title={tr.calendarScreen.header}
      help="calendar"
      count={itemCount}
      right={
        view === 'grid' ? <EditLayoutButton editing={gridEditing} onToggle={() => setGridEditing((v) => !v)} /> : undefined
      }
    >
      {/* Month as widgets, or the week at a glance (wide screens only). */}
      {wide ? (
      <View style={styles.viewSwitch}>
        <SegmentedControl
          value={view}
          onChange={(calendarView) => updateSettings({ calendarView })}
          segments={[
            { value: 'grid', label: tr.calendarScreen.viewGrid },
            { value: 'week', label: tr.calendarScreen.viewWeek },
          ]}
        />
      </View>
      ) : null}
      {body}
    </LayoutScreen>
  );
}

/**
 * Seven days side by side (the week of the selected day): each column has the date, its tasks as
 * coloured chips and the day's spending. Tap a column to see that day below; ‹ › move by a week.
 */
function WeekView({
  anchor,
  tasks,
  expenses,
  selectedDate,
  onSelect,
  onShift,
  currencyOf,
}: {
  anchor: string;
  tasks: Task[];
  expenses: Expense[];
  selectedDate: string;
  onSelect: (key: string) => void;
  onShift: (days: number) => void;
  currencyOf: (e: Expense) => string;
}) {
  const theme = useTheme();
  const tr = useTranslation();
  const router = useRouter();
  const base = new Date(`${anchor}T12:00:00`);
  const monday = new Date(base);
  monday.setDate(base.getDate() - ((base.getDay() + 6) % 7));
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
  const today = todayKey();
  const rangeLabel = `${days[0].toLocaleDateString(tr.localeCode, { day: 'numeric', month: 'short' })} – ${days[6].toLocaleDateString(tr.localeCode, { day: 'numeric', month: 'short', year: 'numeric' })}`;

  return (
    <CustomizableCard widgetId="calendar-week">
      <View style={styles.monthNav}>
        <Pressable onPress={() => onShift(-7)} hitSlop={8}>
          <Text style={[styles.navArrow, { color: theme.colors.primary }]}>‹</Text>
        </Pressable>
        <Text style={[styles.monthLabel, { color: theme.colors.text }]}>{rangeLabel}</Text>
        <Pressable onPress={() => onShift(7)} hitSlop={8}>
          <Text style={[styles.navArrow, { color: theme.colors.primary }]}>›</Text>
        </Pressable>
      </View>
      <View style={styles.weekRow}>
        {days.map((d) => {
          const key = toDateKey(d);
          const selected = key === selectedDate;
          const dayTasks = tasks
            .filter((t) => t.status !== 'done' && t.deadlineAt && toDateKey(new Date(t.deadlineAt)) === key)
            .sort((a, b) => (a.deadlineAt ?? '').localeCompare(b.deadlineAt ?? ''));
          const dayExpenses = expenses.filter((e) => e.date === key);
          const spent = dayExpenses.reduce((sum, e) => sum + e.amount, 0);
          return (
            <Pressable
              key={key}
              onPress={() => onSelect(key)}
              style={[
                styles.weekCol,
                { borderColor: selected ? theme.colors.primary : theme.colors.border, backgroundColor: selected ? `${theme.colors.primary}18` : 'transparent' },
              ]}
            >
              <Text style={[styles.weekDayName, { color: theme.colors.textMuted }]}>
                {d.toLocaleDateString(tr.localeCode, { weekday: 'short' })}
              </Text>
              <Text style={[styles.weekDayNum, { color: key === today ? theme.colors.primary : theme.colors.text }]}>{d.getDate()}</Text>
              <View style={styles.weekChips}>
                {dayTasks.slice(0, 4).map((t) => (
                  <Pressable
                    key={t.id}
                    onPress={() => router.push(`/task/${t.id}`)}
                    style={[styles.weekChip, { backgroundColor: `${priorityColor(theme, t.priority)}33`, borderLeftColor: priorityColor(theme, t.priority) }]}
                  >
                    <Text numberOfLines={2} style={[styles.weekChipText, { color: theme.colors.text }]}>
                      {t.title}
                    </Text>
                  </Pressable>
                ))}
                {dayTasks.length > 4 ? <Text style={[styles.weekMore, { color: theme.colors.textMuted }]}>+{dayTasks.length - 4}</Text> : null}
              </View>
              {spent > 0 ? (
                <Text numberOfLines={1} style={[styles.weekSpent, { color: theme.colors.danger }]}>
                  −{fmtAmount(spent)} {dayExpenses[0] ? currencyOf(dayExpenses[0]) : ''}
                </Text>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </CustomizableCard>
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
  viewSwitch: { paddingHorizontal: 16, marginBottom: 12 },
  dayBlock: { flex: 1, borderWidth: 1, borderRadius: 18, overflow: 'hidden' },
  dayBlockContent: { padding: 12, gap: 8 },
  weekDay: { marginTop: 14, gap: 8 },
  weekRow: { flexDirection: 'row', gap: 6 },
  weekCol: { flex: 1, minHeight: 170, borderWidth: 1, borderRadius: 12, padding: 6, gap: 4 },
  weekDayName: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', textAlign: 'center' },
  weekDayNum: { fontSize: 18, fontWeight: '800', textAlign: 'center' },
  weekChips: { gap: 4, flex: 1 },
  weekChip: { borderLeftWidth: 3, borderRadius: 6, paddingHorizontal: 5, paddingVertical: 3 },
  weekChipText: { fontSize: 11, fontWeight: '600' },
  weekMore: { fontSize: 11, fontWeight: '700' },
  weekSpent: { fontSize: 11, fontWeight: '800', textAlign: 'center' },
  listContent: { paddingHorizontal: 16, paddingBottom: 32, gap: 8 },
  items: { gap: 8 },
  sectionLabel: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 10 },
});

/** Added by you — not the next copy of a repeating task, which appears by itself on completion. */
function isAddedByHand(task: Task): boolean {
  return !task.seriesId || task.seriesId === task.id;
}
