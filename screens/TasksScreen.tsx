import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { fabShape } from '@/theme/surfaces';
import { useTaskStore } from '@/store/useTaskStore';
import { EmptyState, QuickAddBar, ReorderableList, Screen } from '@/components/ui';
import { TaskListItem } from '@/components/task/TaskListItem';
import { ReorderableTaskRow, REORDER_ROW_HEIGHT } from '@/components/task/ReorderableTaskRow';
import { TaskFilterBar } from '@/components/task/TaskFilterBar';
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

  return (
    <Screen style={[styles.container, { paddingTop: insets.top }]}>
      {selectionMode ? (
        <View style={styles.selectionBar}>
          <Pressable onPress={() => setSelectedIds(new Set())} hitSlop={8}>
            <Ionicons name="close" size={24} color={theme.colors.text} />
          </Pressable>
          <Text style={[styles.selectionCount, { color: theme.colors.text }]}>
            {tr.tasksScreen.selectedCount(selectedIds.size)}
          </Text>
          <Pressable onPress={bulkComplete} hitSlop={8} style={styles.selectionAction}>
            <Ionicons name="checkmark-done" size={22} color={theme.colors.success} />
          </Pressable>
          <Pressable onPress={bulkDelete} hitSlop={8} style={styles.selectionAction}>
            <Ionicons name="trash" size={22} color={theme.colors.danger} />
          </Pressable>
        </View>
      ) : (
        <Text style={[styles.header, { color: theme.colors.text }]}>{tr.tasksScreen.header}</Text>
      )}

      <View style={styles.filterWrapper}>
        <TaskFilterBar filters={filters} onChange={setFilters} availableTags={availableTags} />
      </View>

      {visibleTasks.length === 0 ? (
        <EmptyState icon="📋" title={tr.tasksScreen.emptyTitle} subtitle={tr.tasksScreen.emptySubtitle} />
      ) : isManualSort ? (
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
      ) : (
        <FlatList
          data={visibleTasks}
          keyExtractor={(t) => t.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <TaskListItem
              task={item}
              onCycleStatus={setStatus}
              selectionMode={selectionMode}
              selected={selectedIds.has(item.id)}
              onToggleSelect={() => toggleSelect(item.id)}
              onLongPress={() => (selectionMode ? toggleSelect(item.id) : startSelection(item.id))}
            />
          )}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        />
      )}

      {quickAddOpen && !selectionMode ? (
        <QuickAddBar
          placeholder={tr.tasksScreen.quickAddPlaceholder}
          onSubmit={quickAddTask}
          onClose={() => setQuickAddOpen(false)}
          style={{ bottom: insets.bottom + 82 }}
        />
      ) : null}

      {!selectionMode ? (
        <Pressable
          onPress={() => router.push('/task/new')}
          onLongPress={() => setQuickAddOpen(true)}
          style={[styles.fab, { backgroundColor: theme.colors.primary, bottom: insets.bottom + 16 }, fabShape(theme)]}
        >
          <Text style={{ color: theme.colors.primaryText, fontSize: 26, lineHeight: 28 }}>+</Text>
        </Pressable>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { fontSize: 26, fontWeight: '700', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 },
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
