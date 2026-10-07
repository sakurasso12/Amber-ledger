import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { useTaskStore } from '@/store/useTaskStore';
import { EmptyState, Fab, LayoutScreen, QuickAddBar, ReorderableList } from '@/components/ui';
import { TaskListItem } from '@/components/task/TaskListItem';
import { ReorderableTaskRow, REORDER_ROW_HEIGHT } from '@/components/task/ReorderableTaskRow';
import { TaskFilterBar } from '@/components/task/TaskFilterBar';
import { TaskTile } from '@/components/task/TaskTile';
import { FocusTaskCard } from '@/components/task/FocusTaskCard';
import { groupTasksByBucket, groupTasksByDay } from '@/lib/taskGroups';
import { applyTaskFilters, uniqueTags } from '@/lib/taskFilters';
import { haptics } from '@/lib/haptics';
import { useTranslation } from '@/i18n';

export function TasksScreen() {
  const theme = useTheme();
  const tr = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const tasks = useTaskStore((s) => s.tasks);
  const filters = useTaskStore((s) => s.filters);
  const setFilters = useTaskStore((s) => s.setFilters);
  const setStatus = useTaskStore((s) => s.setStatus);
  const reorderTasks = useTaskStore((s) => s.reorderTasks);
  const addTask = useTaskStore((s) => s.addTask);
  const removeTask = useTaskStore((s) => s.removeTask);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const availableTags = useMemo(() => uniqueTags(tasks), [tasks]);
  const visibleTasks = useMemo(() => applyTaskFilters(tasks, filters), [tasks, filters]);
  const isManualSort = filters.sortBy === 'manual';
  const selectionMode = selectedIds.size > 0;

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function startSelection(id: string) {
    haptics.tap();
    setSelectedIds(new Set([id]));
  }

  async function bulkComplete() {
    haptics.success();
    await Promise.all([...selectedIds].map((id) => setStatus(id, 'done')));
    setSelectedIds(new Set());
  }

  async function bulkDelete() {
    haptics.warning();
    await Promise.all([...selectedIds].map((id) => removeTask(id)));
    setSelectedIds(new Set());
  }

  function quickAddTask(title: string) {
    addTask({
      title,
      description: '',
      priority: 'medium',
      status: 'not_started',
      deadlineAt: null,
      isImportant: false,
      tags: [],
      recurrenceRule: null,
      imageUri: null,
      expenseOnComplete: null,
      subtasks: [],
    });
  }

  const layout = theme.layout;
  const rowProps = (task: (typeof visibleTasks)[number]) => ({
    task,
    onCycleStatus: setStatus,
    selectionMode,
    selected: selectedIds.has(task.id),
    onToggleSelect: () => toggleSelect(task.id),
    onLongPress: () => (selectionMode ? toggleSelect(task.id) : startSelection(task.id)),
  });

  // "Focus" layout: the soonest task with a deadline gets the hero card.
  const focusTask = useMemo(
    () => [...visibleTasks].filter((t) => t.deadlineAt).sort((x, y) => x.deadlineAt!.localeCompare(y.deadlineAt!))[0] ?? visibleTasks[0],
    [visibleTasks]
  );

  let list: React.ReactNode;
  if (visibleTasks.length === 0) {
    list = <EmptyState icon="📋" title={tr.tasksScreen.emptyTitle} subtitle={tr.tasksScreen.emptySubtitle} />;
  } else if (isManualSort) {
    list = (
      <ScrollView contentContainerStyle={styles.listContent}>
        <ReorderableList
          items={visibleTasks}
          keyExtractor={(t) => t.id}
          itemHeight={REORDER_ROW_HEIGHT}
          onReorder={reorderTasks}
          renderItem={(task, dragHandleProps, isDragging) => (
            <ReorderableTaskRow task={task} dragHandleProps={dragHandleProps} isDragging={isDragging} />
          )}
        />
      </ScrollView>
    );
  } else if (layout.tasks === 'sections') {
    // Bento: "when" sections, tasks as tiles in two columns.
    list = (
      <ScrollView contentContainerStyle={styles.listContent}>
        {groupTasksByBucket(visibleTasks).map(({ bucket, tasks: group }) => (
          <View key={bucket} style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: bucket === 'overdue' ? theme.colors.danger : theme.colors.text }]}>
                {tr.layoutText.buckets[bucket]}
              </Text>
              <Text style={[styles.sectionCount, { color: theme.colors.textMuted }]}>{group.length}</Text>
            </View>
            {Array.from({ length: Math.ceil(group.length / 2) }, (_, row) => (
              <View key={row} style={styles.tileRow}>
                <TaskTile {...rowProps(group[row * 2])} />
                {group[row * 2 + 1] ? <TaskTile {...rowProps(group[row * 2 + 1])} /> : <View style={styles.tileSpacer} />}
              </View>
            ))}
          </View>
        ))}
      </ScrollView>
    );
  } else if (layout.tasks === 'timeline') {
    // Feed: grouped by deadline day — date on the left, a vertical line, tasks on the right.
    list = (
      <ScrollView contentContainerStyle={styles.listContent}>
        {groupTasksByDay(visibleTasks).map(({ day, tasks: group }) => {
          const date = day ? new Date(`${day}T12:00:00`) : null;
          return (
            <View key={day ?? 'none'} style={styles.timelineGroup}>
              <View style={styles.timelineDate}>
                <Text style={[styles.timelineDay, { color: theme.colors.text }]}>{date ? date.getDate() : '∞'}</Text>
                <Text style={[styles.timelineWeekday, { color: theme.colors.textMuted }]}>
                  {date ? date.toLocaleDateString(tr.localeCode, { weekday: 'short' }) : tr.layoutText.noDeadline}
                </Text>
              </View>
              <View style={[styles.timelineLine, { backgroundColor: theme.colors.primary }]} />
              <View style={styles.timelineItems}>
                {group.map((task) => (
                  <TaskListItem key={task.id} {...rowProps(task)} />
                ))}
              </View>
            </View>
          );
        })}
      </ScrollView>
    );
  } else if (layout.tasks === 'focus' && focusTask) {
    // Vertical: one task in focus, the rest as a compact list below.
    list = (
      <FlatList
        data={visibleTasks.filter((t) => t.id !== focusTask.id)}
        keyExtractor={(t) => t.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.focusHeader}>
            <FocusTaskCard task={focusTask} onDone={() => setStatus(focusTask.id, 'done')} />
            {visibleTasks.length > 1 ? (
              <Text style={[styles.sectionTitle, { color: theme.colors.textMuted }]}>{tr.layoutText.next}</Text>
            ) : null}
          </View>
        }
        renderItem={({ item }) => <TaskListItem {...rowProps(item)} />}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
      />
    );
  } else {
    list = (
      <FlatList
        data={visibleTasks}
        keyExtractor={(t) => t.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => <TaskListItem {...rowProps(item)} />}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
      />
    );
  }

  const selectionBar = selectionMode ? (
    <View style={styles.selectionBar}>
      <Pressable onPress={() => setSelectedIds(new Set())} hitSlop={8}>
        <Ionicons name="close" size={24} color={theme.colors.text} />
      </Pressable>
      <Text style={[styles.selectionCount, { color: theme.colors.text }]}>{tr.tasksScreen.selectedCount(selectedIds.size)}</Text>
      <Pressable onPress={bulkComplete} hitSlop={8} style={styles.selectionAction}>
        <Ionicons name="checkmark-done" size={22} color={theme.colors.success} />
      </Pressable>
      <Pressable onPress={bulkDelete} hitSlop={8} style={styles.selectionAction}>
        <Ionicons name="trash" size={22} color={theme.colors.danger} />
      </Pressable>
    </View>
  ) : undefined;

  return (
    <LayoutScreen title={tr.tasksScreen.header} count={visibleTasks.length} headerOverride={selectionBar}>
      <View style={styles.filterWrapper}>
        <TaskFilterBar filters={filters} onChange={setFilters} availableTags={availableTags} />
      </View>

      {list}

      {quickAddOpen && !selectionMode ? (
        <QuickAddBar
          placeholder={tr.tasksScreen.quickAddPlaceholder}
          onSubmit={quickAddTask}
          onClose={() => setQuickAddOpen(false)}
          style={{ bottom: insets.bottom + 82 }}
        />
      ) : null}

      {!selectionMode ? (
        <Fab
          label={tr.layoutText.add}
          onPress={() => router.push('/task/new')}
          onLongPress={() => setQuickAddOpen(true)}
          bottom={insets.bottom + 16}
        />
      ) : null}
    </LayoutScreen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  selectionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  selectionCount: { fontSize: 16, fontWeight: '700', flex: 1 },
  selectionAction: { padding: 2 },
  filterWrapper: { paddingHorizontal: 16, marginBottom: 8 },
  listContent: { paddingHorizontal: 16, paddingBottom: 96 },
  section: { marginBottom: 18, gap: 10 },
  sectionHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  sectionTitle: { fontSize: 18, fontWeight: '800' },
  sectionCount: { fontSize: 14, fontWeight: '700' },
  tileRow: { flexDirection: 'row', gap: 10 },
  tileSpacer: { flex: 1 },
  timelineGroup: { flexDirection: 'row', gap: 12, marginBottom: 18 },
  timelineDate: { width: 46, alignItems: 'center', paddingTop: 4 },
  timelineDay: { fontSize: 26, fontWeight: '800', lineHeight: 28 },
  timelineWeekday: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', textAlign: 'center' },
  timelineLine: { width: 3, borderRadius: 2 },
  timelineItems: { flex: 1, gap: 8 },
  focusHeader: { gap: 14, marginBottom: 10 },
});
