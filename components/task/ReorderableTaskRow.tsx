import React from 'react';
import { PanResponderInstance, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { priorityColor } from '@/theme/theme';
import { Task } from '@/types';

export const REORDER_ROW_HEIGHT = 52;

/** Compact fixed-height row used only while manually reordering (see ReorderableList) — a
 * uniform height is required for the drag position math, so the richer TaskListItem (variable
 * height: tags, photo, subtask count...) isn't used here. */
export function ReorderableTaskRow({
  task,
  dragHandleProps,
  isDragging,
}: {
  task: Task;
  dragHandleProps: PanResponderInstance['panHandlers'];
  isDragging: boolean;
}) {
  const theme = useTheme();
  const router = useRouter();

  return (
    <View
      style={[
        styles.row,
        { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
        isDragging && { borderColor: theme.colors.primary, shadowOpacity: 0.2 },
      ]}
    >
      <View style={[styles.dot, { backgroundColor: priorityColor(theme, task.priority) }]} />
      <Pressable style={styles.titleWrap} onPress={() => router.push(`/task/${task.id}`)}>
        <Text numberOfLines={1} style={[styles.title, { color: theme.colors.text }]}>
          {task.title}
        </Text>
      </Pressable>
      <View {...dragHandleProps} style={styles.handle} hitSlop={8}>
        <Ionicons name="reorder-three" size={22} color={theme.colors.textMuted} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    shadowColor: '#000',
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  titleWrap: { flex: 1 },
  title: { fontSize: 14, fontWeight: '600' },
  handle: { padding: 6 },
});
