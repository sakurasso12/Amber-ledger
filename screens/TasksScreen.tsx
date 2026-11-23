import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { useAnimatedRef } from 'react-native-reanimated';
import { Text } from '@/components/ui/Text';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { useTaskStore } from '@/store/useTaskStore';
import { EditLayoutButton, EmptyState, Fab, GridBoard, GridModule, HiddenModulesButton, LayoutScreen, MIN_WIDE, ModuleSize, QuickAddBar, useHiddenBoardItems } from '@/components/ui';
import { LayoutScrollContext } from '@/components/ui/LayoutEditing';
import { TaskListItem } from '@/components/task/TaskListItem';
import { TaskBoard } from '@/components/task/TaskBoard';
import { TaskModules, useHiddenTaskModules } from '@/components/task/TaskModules';
import { HabitCard } from '@/components/task/HabitCard';
import { LevelCard } from '@/components/task/LevelCard';
import { useSimpleMode } from '@/components/mascot/Tymofii';
import { BigActions } from '@/components/ui/BigActions';
import { SimpleTaskList } from '@/components/task/SimpleTaskList';
import { useSettingsStore } from '@/store/useSettingsStore';
import { FocusTaskCard } from '@/components/task/FocusTaskCard';
import { activeTasks, manualOrder } from '@/lib/taskFilters';
import { buildHabits } from '@/lib/streaks';
import { haptics } from '@/lib/haptics';
import { useTranslation } from '@/i18n';

export function TasksScreen() {
  const theme = useTheme();
  const simpleMode = useSettingsStore((st) => st.settings.uiMode === 'simple');
  const tr = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
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
  // Simple mode: just the list — no hero card for the next task.
  const showFocus = layout.tasks === 'focus' && !!focusTask && !selectionMode && !simpleMode;

  // The task list as ONE widget (2.0): a block whose height is dragged within limits, the tasks
  // scrolling inside — not a card per task.
  const simple = useSimpleMode();
  const listTasks = showFocus ? orderedTasks.filter((t) => t.id !== focusTask.id) : orderedTasks;
  const tasksBlock = (
    <View style={[styles.tasksBlock, { borderColor: theme.colors.border, backgroundColor: `${theme.colors.surface}66` }]}>
      {showFocus && listTasks.length > 0 ? (
        <Text style={[styles.sectionTitle, { color: theme.colors.textMuted }]}>{tr.layoutText.next}</Text>
      ) : null}
      <ScrollView style={styles.flex} contentContainerStyle={styles.tasksList} nestedScrollEnabled keyboardShouldPersistTaps="handled">
        {visibleTasks.length === 0 ? (
          <EmptyState icon="📋" title={tr.tasksScreen.emptyTitle} subtitle={tr.tasksScreen.emptySubtitle} />
        ) : listTasks.length === 0 ? (
          <Text style={[styles.onlyFocus, { color: theme.colors.textMuted }]}>{tr.layoutText.onlyFocus}</Text>
        ) : (
          listTasks.map((task) => (
            <TaskListItem
              key={task.id}
              task={task}
              onCycleStatus={setStatus}
              selectionMode={selectionMode}
              selected={selectedIds.has(task.id)}
              onToggleSelect={() => toggleSelect(task.id)}
              onLongPress={() => (selectionMode ? toggleSelect(task.id) : startSelection(task.id))}
            />
          ))
        )}
      </ScrollView>
    </View>
  );

  // Everything on Tasks is a widget on the grid: the level ring, each habit, the task in focus and
  // the task list block — moved and resized in edit mode (pencil).
  const modules: GridModule[] = [
    // The level ring is a game extra — not in the simple mode.
    ...(simple ? [] : [{
      key: 'level',
      title: tr.level.tasksDone,
      sizes: ['half'],
      minWidth: SQUARE_MIN,
      aspect: 1,
      render: (_size: ModuleSize, width = 160) => <LevelCard size={width} />,
    }] as GridModule[]),
    ...habitList.map((habit) => ({
      key: `habit-${habit.seriesId}`,
      title: habit.title,
      sizes: ['half'] as ModuleSize[],
      minWidth: SQUARE_MIN,
      aspect: 1,
      removable: false,
      render: (_size: ModuleSize, width = 160) => <HabitCard habit={habit} size={width} editing={editingLayout} />,
    })),
    ...(showFocus
      ? [
          {
            key: 'focus',
            title: tr.layoutText.focus,
            sizes: ['full'] as ModuleSize[],
            minWidth: MIN_WIDE,
            render: () => <FocusTaskCard task={focusTask} cardId="tasks-focus" editing={editingLayout} onDone={() => setStatus(focusTask.id, 'done')} />,
          },
        ]
      : []),
    {
      key: 'tasks-list',
      title: tr.tasksScreen.header,
      sizes: ['full'],
      minWidth: MIN_WIDE,
      removable: false,
      resizableHeight: { min: 240, max: 1000, initial: 480 },
      render: () => tasksBlock,
    },
  ];

  // ⋮ while editing: widgets removed from Tasks (the phone board keeps its own list, as in 1.7).
  const { width: screenWidth } = useWindowDimensions();
  const narrow = screenWidth < 600;
  const gridHidden = useHiddenBoardItems('tasks', modules);
  const phoneHidden = useHiddenTaskModules(showFocus);
  const hiddenModules = narrow ? phoneHidden : gridHidden;

  // Phone: exactly the 1.7 board — habit squares (2 or 3 per row), the focus card among them, then
  // a card per task. The widget grid is for wider screens (PC / web).
  const board = (boardTasks: typeof visibleTasks) => (
    <TaskBoard
      tasks={boardTasks}
      editing={editingLayout}
      onCycleStatus={setStatus}
      selection={{ active: selectionMode, selectedIds, toggle: toggleSelect, start: startSelection }}
    />
  );
  let phoneBody: React.ReactNode;
  if (visibleTasks.length === 0) {
    phoneBody = <EmptyState icon="📋" title={tr.tasksScreen.emptyTitle} subtitle={tr.tasksScreen.emptySubtitle} />;
  } else if (showFocus) {
    phoneBody = (
      <View style={styles.focusHeader}>
        {visibleTasks.length > 1 ? (
          <Text style={[styles.sectionTitle, { color: theme.colors.textMuted }]}>{tr.layoutText.next}</Text>
        ) : null}
        {board(orderedTasks.filter((t) => t.id !== focusTask.id))}
      </View>
    );
  } else {
    phoneBody = board(orderedTasks);
  }

  const list = (
    <LayoutScrollContext.Provider value={scrollRef}>
    <Animated.ScrollView ref={scrollRef} contentContainerStyle={styles.listContent} keyboardShouldPersistTaps="handled">
      {narrow ? (
        <>
          {selectionMode ? null : (
            <View style={styles.habitsHeader}>
              <TaskModules
                habits={habitList}
                editing={editingLayout}
                hideLevel={simple}
                focus={showFocus ? <FocusTaskCard task={focusTask} cardId="tasks-focus" editing={editingLayout} onDone={() => setStatus(focusTask.id, 'done')} /> : undefined}
              />
            </View>
          )}
          {phoneBody}
        </>
      ) : (
        <GridBoard boardId="tasks" modules={modules} editing={editingLayout && !selectionMode} proportional />
      )}
    </Animated.ScrollView>
    </LayoutScrollContext.Provider>
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
      title={simpleMode ? tr.uiMode.tabTasks : tr.tasksScreen.header}
      help="tasks"
      count={visibleTasks.length + habitList.length}
      headerOverride={selectionBar}
      right={
        // Pencil: rearrange and resize the cards; the check mark ends editing. ⋮ brings back removed ones.
        <View style={styles.headerRight}>
          {/* Simple mode has no pencil: the removed widgets come back from here. */}
          {editingLayout || (simpleMode && hiddenModules.length > 0) ? <HiddenModulesButton items={hiddenModules} /> : null}
          <EditLayoutButton helpId="tasks.edit" editing={editingLayout} onToggle={() => setEditingLayout((v) => !v)} />
        </View>
      }
    >
      {simpleMode ? (
        // Simple mode (1.8): plain sections with big rows, as in the mock-up — no widgets.
        <ScrollView contentContainerStyle={[styles.listContent, styles.simpleContent]}>
          <SimpleTaskList />
        </ScrollView>
      ) : (
        list
      )}

      {quickAddOpen && !selectionMode ? (
        <QuickAddBar
          placeholder={tr.tasksScreen.quickAddPlaceholder}
          onSubmit={quickAddTask}
          onClose={() => setQuickAddOpen(false)}
          closeOnSubmit
          style={{ bottom: insets.bottom + 82 }}
        />
      ) : null}

      {!selectionMode && !editingLayout ? (
        simpleMode ? (
          <BigActions bottom={insets.bottom + 16} actions={[{ label: tr.uiMode.addTask, icon: 'add', onPress: () => router.push('/task/new') }]} />
        ) : (
          <Fab
            helpId="tasks.fab"
            onPress={() => router.push('/task/new')}
            onLongPress={() => setQuickAddOpen(true)}
            bottom={insets.bottom + 16}
          />
        )
      ) : null}
    </LayoutScreen>
  );
}

/**
 * Level ring and habit squares, measured 22.11: at 92 px (one PC column) the label is cut
 * ("TASKS…") and the ⋮ sits on the ring; the phone's half tile (~158 px) is their design size.
 */
const SQUARE_MIN = 140;

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
  flex: { flex: 1 },
  tasksBlock: { flex: 1, borderWidth: 1, borderRadius: 18, padding: 12, gap: 10, overflow: 'hidden' },
  tasksList: { gap: 8, paddingBottom: 4 },
  focusHeader: { gap: 14, marginBottom: 10 },
  simpleContent: { paddingBottom: 110 },
  habitsHeader: { marginBottom: 14 },
  onlyFocus: { fontSize: 14, textAlign: 'center', paddingVertical: 24 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
});
