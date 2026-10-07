import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/theme/ThemeProvider';
import { cardSurface } from '@/theme/surfaces';
import { priorityColor } from '@/theme/theme';
import { Task, TaskStatus } from '@/types';
import { useTranslation } from '@/i18n';
import { haptics } from '@/lib/haptics';

interface TaskTileProps {
  task: Task;
  onCycleStatus: (id: string, status: TaskStatus) => void;
  selected?: boolean;
  selectionMode?: boolean;
  onToggleSelect?: () => void;
  onLongPress?: () => void;
}

const NEXT: Record<TaskStatus, TaskStatus> = { not_started: 'in_progress', in_progress: 'done', done: 'not_started' };

/** Compact square-ish task card for the 2-column grid of the "Bento" layout. */
export function TaskTile({ task, onCycleStatus, selected, selectionMode, onToggleSelect, onLongPress }: TaskTileProps) {
  const theme = useTheme();
  const tr = useTranslation();
  const router = useRouter();
  const color = priorityColor(theme, task.priority);
  const deadline = task.deadlineAt ? new Date(task.deadlineAt) : null;
  const overdue = !!deadline && deadline.getTime() < Date.now();
  const time = deadline
    ? deadline.toDateString() === new Date().toDateString()
      ? deadline.toLocaleTimeString(tr.localeCode, { hour: '2-digit', minute: '2-digit' })
      : deadline.toLocaleDateString(tr.localeCode, { day: 'numeric', month: 'short' })
    : null;

  return (
    <Pressable
      onPress={selectionMode ? onToggleSelect : () => router.push(`/task/${task.id}`)}
      onLongPress={onLongPress}
      style={[styles.tile, cardSurface(theme), selected && { borderColor: theme.colors.primary, borderWidth: 2 }]}
    >
      <View style={[styles.stripe, { backgroundColor: color }]} />
      <View style={styles.top}>
        <Text style={[styles.time, { color: overdue ? theme.colors.danger : theme.colors.textMuted }]}>
          {time ?? '—'}
        </Text>
        <Pressable
          hitSlop={10}
          onPress={() => {
            haptics.tap();
            if (NEXT[task.status] === 'done') haptics.success();
            onCycleStatus(task.id, NEXT[task.status]);
          }}
        >
          <Ionicons
            name={selectionMode ? (selected ? 'checkbox' : 'square-outline') : task.status === 'in_progress' ? 'contrast-outline' : 'ellipse-outline'}
            size={22}
            color={selected ? theme.colors.primary : theme.colors.textMuted}
          />
        </Pressable>
      </View>
      <Text numberOfLines={3} style={[styles.title, { color: theme.colors.text }]}>
        {task.isImportant ? '⭐ ' : ''}
        {task.title}
      </Text>
      {task.tags.length > 0 ? (
        <Text numberOfLines={1} style={[styles.tags, { color: theme.colors.accent }]}>
          {task.tags.map((t) => `#${t}`).join(' ')}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: { flex: 1, minHeight: 116, padding: 12, gap: 6, overflow: 'hidden' },
  stripe: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 5 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  time: { fontSize: 12, fontWeight: '700' },
  title: { fontSize: 15, fontWeight: '700', lineHeight: 20 },
  tags: { fontSize: 11, fontWeight: '600' },
});
