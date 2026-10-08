import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { useTaskStore } from '@/store/useTaskStore';
import { EditLayoutButton, EmptyState, Fab, LayoutScreen, QuickAddBar } from '@/components/ui';
import { TaskBoard } from '@/components/task/TaskBoard';
import { useSettingsStore } from '@/store/useSettingsStore';
import { FocusTaskCard } from '@/components/task/FocusTaskCard';
import { TaskModules } from '@/components/task/TaskModules';
import { activeTasks, manualOrder } from '@/lib/taskFilters';
import { buildHabits } from '@/lib/streaks';
import { haptics } from '@/lib/haptics';
import { useTranslation } from '@/i18n';

export function TasksScreen() {
  const theme = useTheme();
  const tr = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const tasks = useTaskStore((s) => s.tasks);
  const setStatus = useTaskStore((s) => s.setStatus);
  const addTask = useTaskStore((s) => s.addTask);
  const removeTask = useTaskStore((s) => s.removeTask);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [editingLayout, setEditingLayout] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const visibleTasks = useMemo(() => activeTasks(tasks), [tasks]);
  const habitList = useMemo(() => buildHabits(tasks), [tasks]);
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
  const orderMode = useSettingsStore((st) => st.settings.taskOrderMode);
  const savedOrder = useSettingsStore((st) => st.settings.taskManualOrder);
  const orderedTasks = useMemo(
    () => (orderMode === 'manual' ? manualOrder(visibleTasks, savedOrder) : visibleTasks),
    [visibleTasks, orderMode, savedOrder]
  );

  // "Focus" layout: the soonest task with a deadline gets the hero card.
  const focusTask = useMemo(
    () => [...visibleTasks].filter((t) => t.deadlineAt).sort((x, y) => x.deadlineAt!.localeCompare(y.deadlineAt!))[0] ?? visibleTasks[0],
    [visibleTasks]
  );
  const showFocus = layout.tasks === 'focus' && !!focusTask && !selectionMode;

  const board = (boardTasks: typeof visibleTasks) => (
    <TaskBoard
      tasks={boardTasks}
      editing={editingLayout}
      onCycleStatus={setStatus}
      selection={{ active: selectionMode, selectedIds, toggle: toggleSelect, start: startSelection }}
    />
  );

  // One scrolling column: habit squares, then (Vertical) the task in focus, then every task card.
  let body: React.ReactNode;
  if (visibleTasks.length === 0) {
    body = <EmptyState icon="📋" title={tr.tasksScreen.emptyTitle} subtitle={tr.tasksScreen.emptySubtitle} />;
  } else if (showFocus) {
    // The focus card itself lives among the modules above (it can be dragged there); here the rest.
    body = (
      <View style={styles.focusHeader}>
        {visibleTasks.length > 1 ? (
          <Text style={[styles.sectionTitle, { color: theme.colors.textMuted }]}>{tr.layoutText.next}</Text>
        ) : null}
        {board(orderedTasks.filter((t) => t.id !== focusTask.id))}
      </View>
    );
  } else {
    body = board(orderedTasks);
  }

  const list = (
    <ScrollView contentContainerStyle={styles.listContent} keyboardShouldPersistTaps="handled">
      {selectionMode ? null : (
        <View style={styles.habitsHeader}>
          <TaskModules
            habits={habitList}
            editing={editingLayout}
            focus={showFocus ? <FocusTaskCard task={focusTask} editing={editingLayout} onDone={() => setStatus(focusTask.id, 'done')} /> : undefined}
          />
        </View>
      )}
      {body}
    </ScrollView>
  );

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
    <LayoutScreen
      title={tr.tasksScreen.header}
      count={visibleTasks.length + habitList.length}
      headerOverride={selectionBar}
      right={
        // Pencil: rearrange and resize the cards; the check mark ends editing.
        <EditLayoutButton editing={editingLayout} onToggle={() => setEditingLayout((v) => !v)} />
      }
    >
      {list}

      {quickAddOpen && !selectionMode ? (
        <QuickAddBar
          placeholder={tr.tasksScreen.quickAddPlaceholder}
          onSubmit={quickAddTask}
          onClose={() => setQuickAddOpen(false)}
          style={{ bottom: insets.bottom + 82 }}
        />
      ) : null}

      {!selectionMode && !editingLayout ? (
        <Fab
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
  listContent: { paddingHorizontal: 16, paddingBottom: 96 },
  sectionTitle: { fontSize: 18, fontWeight: '800' },
  focusHeader: { gap: 14, marginBottom: 10 },
  habitsHeader: { marginBottom: 14 },
});
