import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { ReorderableList, TextField } from '@/components/ui';
import { useTranslation } from '@/i18n';

const ROW_HEIGHT = 36;

export interface DraftSubtask {
  id: string;
  title: string;
  isDone: boolean;
  sortOrder: number;
}

interface SubtaskChecklistProps {
  subtasks: DraftSubtask[];
  onChange: (subtasks: DraftSubtask[]) => void;
}

export function SubtaskChecklist({ subtasks, onChange }: SubtaskChecklistProps) {
  const theme = useTheme();
  const tr = useTranslation();
  const [newTitle, setNewTitle] = useState('');
  const done = subtasks.filter((s) => s.isDone).length;

  function addSubtask() {
    const title = newTitle.trim();
    if (!title) return;
    onChange([
      ...subtasks,
      { id: `draft-${Date.now()}-${Math.random()}`, title, isDone: false, sortOrder: subtasks.length },
    ]);
    setNewTitle('');
  }

  function toggle(id: string) {
    onChange(subtasks.map((s) => (s.id === id ? { ...s, isDone: !s.isDone } : s)));
  }

  function remove(id: string) {
    onChange(subtasks.filter((s) => s.id !== id));
  }

  function reorder(next: DraftSubtask[]) {
    onChange(next.map((s, index) => ({ ...s, sortOrder: index })));
  }

  return (
    <View style={styles.wrapper}>
      <View style={styles.headerRow}>
        <Text style={[styles.label, { color: theme.colors.textMuted }]}>{tr.subtaskChecklist.title}</Text>
        {subtasks.length > 0 ? (
          <Text style={[styles.progress, { color: theme.colors.textMuted }]}>
            {done} {tr.subtaskChecklist.of} {subtasks.length}
          </Text>
        ) : null}
      </View>

      {subtasks.length > 0 ? (
        <ReorderableList
          items={subtasks}
          keyExtractor={(s) => s.id}
          itemHeight={ROW_HEIGHT}
          onReorder={reorder}
          renderItem={(s, dragHandleProps) => (
            <View style={styles.item}>
              <Pressable onPress={() => toggle(s.id)} hitSlop={8}>
                <Text style={{ fontSize: 17, color: s.isDone ? theme.colors.success : theme.colors.textMuted }}>
                  {s.isDone ? '☑' : '☐'}
                </Text>
              </Pressable>
              <Text
                numberOfLines={1}
                style={[
                  styles.itemText,
                  { color: theme.colors.text },
                  s.isDone && { color: theme.colors.textMuted, textDecorationLine: 'line-through' },
                ]}
              >
                {s.title}
              </Text>
              <Pressable onPress={() => remove(s.id)} hitSlop={8}>
                <Text style={{ color: theme.colors.danger, fontSize: 15 }}>✕</Text>
              </Pressable>
              <View {...dragHandleProps} hitSlop={8} style={styles.dragHandle}>
                <Ionicons name="reorder-three" size={18} color={theme.colors.textMuted} />
              </View>
            </View>
          )}
        />
      ) : null}

      <View style={styles.addRow}>
        <TextField
          style={styles.addInput}
          value={newTitle}
          onChangeText={setNewTitle}
          placeholder={tr.subtaskChecklist.addPlaceholder}
          onSubmitEditing={addSubtask}
          returnKeyType="done"
        />
        <Pressable onPress={addSubtask} style={[styles.addButton, { backgroundColor: theme.colors.primary }]}>
          <Text style={{ color: theme.colors.primaryText, fontWeight: '700' }}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 8 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontSize: 13, fontWeight: '600' },
  progress: { fontSize: 12 },
  item: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  itemText: { flex: 1, fontSize: 14 },
  dragHandle: { padding: 4 },
  addRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  addInput: { flex: 1 },
  addButton: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
