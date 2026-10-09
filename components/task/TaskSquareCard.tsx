import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { cardSurface } from '@/theme/surfaces';
import { priorityColor } from '@/theme/theme';
import { useTaskStore } from '@/store/useTaskStore';
import { haptics } from '@/lib/haptics';
import { PressableScale, Text } from '@/components/ui';
import { widgetDeadlineLabel } from '@/widget/widgetShared';
import { Task } from '@/types';

/** Size S: a half-width square — title, priority dot and deadline, a circle to tick it off. */
export function TaskSquareCard({ task, editing = false }: { task: Task; editing?: boolean }) {
  const theme = useTheme();
  const router = useRouter();
  const setStatus = useTaskStore((s) => s.setStatus);
  const overdue = !!task.deadlineAt && new Date(task.deadlineAt).getTime() < Date.now();

  return (
    <PressableScale
      disabled={editing}
      onPress={() => router.push(`/task/${task.id}`)}
      scaleTo={0.95}
      style={[styles.card, cardSurface(theme)]}
    >
      <View style={styles.top}>
        <View style={[styles.dot, { backgroundColor: priorityColor(theme, task.priority) }]} />
        {task.isImportant ? <Text style={styles.star}>⭐</Text> : null}
        <View style={styles.flex} />
        <Pressable
          hitSlop={10}
          disabled={editing}
          onPress={() => {
            haptics.success();
            setStatus(task.id, 'done');
          }}
        >
          <Ionicons name="ellipse-outline" size={24} color={theme.colors.textMuted} />
        </Pressable>
      </View>
      <Text style={[styles.title, { color: theme.colors.text }]} numberOfLines={3}>
        {task.title}
      </Text>
      <View style={styles.flex} />
      {task.deadlineAt ? (
        <Text style={[styles.deadline, { color: overdue ? theme.colors.danger : theme.colors.textMuted }]} numberOfLines={1}>
          {widgetDeadlineLabel(task.deadlineAt)}
        </Text>
      ) : null}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: { padding: 14, gap: 8, aspectRatio: 1 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  star: { fontSize: 12 },
  title: { fontSize: 16, fontWeight: '700', lineHeight: 20 },
  deadline: { fontSize: 13, fontWeight: '600' },
});
