import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Sortable from 'react-native-sortables';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useTaskStore } from '@/store/useTaskStore';
import { taskKey } from '@/lib/taskFilters';
import { haptics } from '@/lib/haptics';
import { SegmentedControl, Text } from '@/components/ui';
import { LayoutEditItem, useLayoutHint } from '@/components/ui/LayoutEditItem';
import { useTranslation } from '@/i18n';
import { Task, TaskStatus } from '@/types';
import { TaskListItem } from './TaskListItem';
import { TaskSquareCard } from './TaskSquareCard';
import { FocusTaskCard } from './FocusTaskCard';

type Size = 'S' | 'M' | 'L';
const NEXT_SIZE: Record<Size, Size> = { S: 'M', M: 'L', L: 'S' };
const GAP = 10;

interface TaskBoardProps {
  tasks: Task[];
  editing: boolean;
  /** Bulk selection on: every task shows as a plain row with a checkbox. */
  selection: {
    active: boolean;
    selectedIds: Set<string>;
    toggle: (id: string) => void;
    start: (id: string) => void;
  };
  onCycleStatus: (id: string, status: TaskStatus) => void;
}

/**
 * The task list as cards of three sizes — S (half-width square), M (row), L (big card) — up to two
 * per row. In edit mode they can be dragged into your own order and resized with the corner button.
 */
export function TaskBoard({ tasks, editing, selection, onCycleStatus }: TaskBoardProps) {
  const theme = useTheme();
  const tr = useTranslation();
  const sizes = useSettingsStore((s) => s.settings.taskCardSizes);
  const orderMode = useSettingsStore((s) => s.settings.taskOrderMode);
  const updateSettings = useSettingsStore((s) => s.updateSettings);
  const setStatus = useTaskStore((s) => s.setStatus);
  const [width, setWidth] = useState(0);
  const [drops, setDrops] = useState<Record<string, number>>({});
  const { showHint, markSeen } = useLayoutHint('tasks-board');

  const sizeOf = (task: Task): Size => (selection.active ? 'M' : (sizes[taskKey(task)] ?? 'M'));
  const half = Math.floor((width - GAP) / 2);

  function resize(task: Task) {
    haptics.tap();
    updateSettings({ taskCardSizes: { ...sizes, [taskKey(task)]: NEXT_SIZE[sizeOf(task)] } });
  }

  function renderCard(task: Task) {
    const size = sizeOf(task);
    if (size === 'S') return <TaskSquareCard task={task} editing={editing} />;
    if (size === 'L') {
      return (
        <FocusTaskCard task={task} editing={editing} kicker={tr.priority[task.priority].toUpperCase()} onDone={() => setStatus(task.id, 'done')} />
      );
    }
    return (
      <TaskListItem
        task={task}
        onCycleStatus={onCycleStatus}
        selectionMode={selection.active}
        selected={selection.selectedIds.has(task.id)}
        onToggleSelect={() => selection.toggle(task.id)}
        onLongPress={editing ? undefined : () => (selection.active ? selection.toggle(task.id) : selection.start(task.id))}
      />
    );
  }

  return (
    <View style={styles.wrap}>
      {editing ? (
        <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)} style={styles.orderRow}>
          <Text style={[styles.orderLabel, { color: theme.colors.textMuted }]}>{tr.layoutEdit.order}</Text>
          <View style={styles.flex}>
            <SegmentedControl
              value={orderMode}
              onChange={(taskOrderMode) => updateSettings({ taskOrderMode })}
              segments={[
                { value: 'deadline', label: tr.layoutEdit.byDeadline },
                { value: 'manual', label: tr.layoutEdit.ownOrder },
              ]}
            />
          </View>
        </Animated.View>
      ) : null}

      <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        {width > 0 ? (
          <Sortable.Flex
            flexDirection="row"
            flexWrap="wrap"
            rowGap={8}
            columnGap={GAP}
            sortEnabled={editing}
            dragActivationDelay={150}
            activeItemScale={0.92}
            activeItemShadowOpacity={0.25}
            inactiveItemOpacity={1}
            hapticsEnabled
            onDragEnd={({ order }) => {
              // Dragging means "my own order" from now on.
              updateSettings({ taskOrderMode: 'manual', taskManualOrder: order(tasks).map(taskKey) });
              markSeen();
            }}
            onActiveItemDropped={({ key }) => setDrops((d) => ({ ...d, [key]: (d[key] ?? 0) + 1 }))}
          >
            {tasks.map((task, index) => (
              <View key={task.id} style={{ width: sizeOf(task) === 'S' ? half : width }}>
                <LayoutEditItem hint={editing && index === 0 && showHint} dropCount={drops[task.id] ?? 0}>
                  {renderCard(task)}
                  {editing ? (
                    // The corner button cycles the size: S → M → L.
                    <Pressable
                      onPress={() => resize(task)}
                      hitSlop={8}
                      accessibilityLabel={tr.layoutEdit.resize}
                      style={[styles.resize, { backgroundColor: theme.colors.primary }]}
                    >
                      <Ionicons name="resize" size={14} color={theme.colors.primaryText} />
                      <Text style={[styles.resizeText, { color: theme.colors.primaryText }]}>{sizeOf(task)}</Text>
                    </Pressable>
                  ) : null}
                </LayoutEditItem>
              </View>
            ))}
          </Sortable.Flex>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  wrap: { gap: 12 },
  orderRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  orderLabel: { fontSize: 13, fontWeight: '600' },
  resize: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 14,
  },
  resizeText: { fontSize: 11, fontWeight: '800' },
});
