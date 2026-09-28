import React, { useEffect, useRef } from 'react';
import { Animated, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { useTaskStore } from '@/store/useTaskStore';
import { Task, TaskStatus } from '@/types';
import { useTranslation } from '@/i18n';
import { Translation } from '@/i18n/translations';
import { SwipeableRow } from '@/components/ui';
import { deletePersistedImage } from '@/lib/imagePicker';
import { haptics } from '@/lib/haptics';
import { PriorityBadge } from './PriorityBadge';

const STATUS_CYCLE: Record<TaskStatus, TaskStatus> = {
  not_started: 'in_progress',
  in_progress: 'done',
  done: 'not_started',
};

const STATUS_ICON: Record<TaskStatus, keyof typeof Ionicons.glyphMap> = {
  not_started: 'ellipse-outline',
  in_progress: 'contrast-outline',
  done: 'checkmark-circle',
};

function formatDeadline(iso: string | null, tr: Translation): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const datePart = isToday
    ? tr.taskListItem.today
    : d.toLocaleDateString(tr.localeCode, { day: 'numeric', month: 'short' });
  const timePart = d.toLocaleTimeString(tr.localeCode, { hour: '2-digit', minute: '2-digit' });
  return `${datePart}, ${timePart}`;
}

interface TaskListItemProps {
  task: Task;
  onCycleStatus: (id: string, status: TaskStatus) => void;
  /** When true, renders a checkbox instead of swipe actions and the status cycle — tapping the
   * row toggles selection instead of opening it. Used by the bulk-select mode in TasksScreen. */
  selectionMode?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
  onLongPress?: () => void;
}

export function TaskListItem({ task, onCycleStatus, selectionMode, selected, onToggleSelect, onLongPress }: TaskListItemProps) {
  const theme = useTheme();
  const tr = useTranslation();
  const router = useRouter();
  const setStatus = useTaskStore((s) => s.setStatus);
  const removeTask = useTaskStore((s) => s.removeTask);
  const isDone = task.status === 'done';
  const deadlineText = formatDeadline(task.deadlineAt, tr);
  const isOverdue = !!task.deadlineAt && !isDone && new Date(task.deadlineAt).getTime() < Date.now();
  const doneSubtasks = task.subtasks.filter((s) => s.isDone).length;
  const checkScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!isDone) return;
    checkScale.setValue(0.6);
    Animated.spring(checkScale, { toValue: 1, useNativeDriver: true, friction: 4 }).start();
  }, [isDone, checkScale]);

  async function handleDelete() {
    if (task.imageUri) await deletePersistedImage(task.imageUri);
    await removeTask(task.id);
  }

  function handleCyclePress() {
    haptics.tap();
    const next = STATUS_CYCLE[task.status];
    if (next === 'done') haptics.success();
    onCycleStatus(task.id, next);
  }

  const content = (
    <Pressable
      onPress={selectionMode ? onToggleSelect : () => router.push(`/task/${task.id}`)}
      onLongPress={onLongPress}
      style={[
        styles.row,
        { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
        selected && { borderColor: theme.colors.primary, borderWidth: 2 },
      ]}
    >
      {selectionMode ? (
        <View style={styles.statusButton}>
          <Ionicons
            name={selected ? 'checkbox' : 'square-outline'}
            size={22}
            color={selected ? theme.colors.primary : theme.colors.textMuted}
          />
        </View>
      ) : (
        <Pressable hitSlop={10} onPress={handleCyclePress} style={styles.statusButton}>
          <Animated.View style={{ transform: [{ scale: checkScale }] }}>
            <Ionicons name={STATUS_ICON[task.status]} size={22} color={isDone ? theme.colors.success : theme.colors.textMuted} />
          </Animated.View>
        </Pressable>
      )}

      <View style={styles.body}>
        <View style={styles.titleRow}>
          {task.isImportant ? <Text style={styles.star}>⭐</Text> : null}
          <Text
            numberOfLines={1}
            style={[
              styles.title,
              { color: isDone ? theme.colors.textMuted : theme.colors.text },
              isDone && styles.strike,
            ]}
          >
            {task.title}
          </Text>
        </View>

        <View style={styles.metaRow}>
          <PriorityBadge priority={task.priority} />
          {deadlineText ? (
            <Text style={[styles.meta, { color: isOverdue ? theme.colors.danger : theme.colors.textMuted }]}>
              {deadlineText}
            </Text>
          ) : null}
          {task.subtasks.length > 0 ? (
            <Text style={[styles.meta, { color: theme.colors.textMuted }]}>
              {doneSubtasks}/{task.subtasks.length}
            </Text>
          ) : null}
        </View>

        {task.tags.length > 0 ? (
          <View style={styles.tagsRow}>
            {task.tags.map((tag) => (
              <Text key={tag} style={[styles.tag, { color: theme.colors.accent }]}>
                #{tag}
              </Text>
            ))}
          </View>
        ) : null}
      </View>

      {task.imageUri ? <Image source={{ uri: task.imageUri }} style={styles.thumbnail} /> : null}
    </Pressable>
  );

  if (selectionMode) return content;

  return (
    <SwipeableRow
      rightAction={{
        icon: <Ionicons name="checkmark" size={20} color="#fff" />,
        color: theme.colors.success,
        onTrigger: () => setStatus(task.id, 'done'),
      }}
      leftAction={{
        icon: <Ionicons name="trash" size={20} color="#fff" />,
        color: theme.colors.danger,
        onTrigger: handleDelete,
      }}
    >
      {content}
    </SwipeableRow>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  statusButton: { paddingTop: 2 },
  body: { flex: 1, gap: 6 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  star: { fontSize: 13 },
  title: { fontSize: 15, fontWeight: '600', flexShrink: 1 },
  strike: { textDecorationLine: 'line-through' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  meta: { fontSize: 12 },
  tagsRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  tag: { fontSize: 12, fontWeight: '600' },
  thumbnail: { width: 44, height: 44, borderRadius: 10 },
});
