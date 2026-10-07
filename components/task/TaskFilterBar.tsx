import React, { useState } from 'react';
import { LayoutAnimation, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { Badge, Chip } from '@/components/ui';
import { useTranslation } from '@/i18n';
import { Translation } from '@/i18n/translations';
import { Priority, TaskFilters, TaskSortKey, TaskStatus } from '@/types';

function statusOptions(tr: Translation): { value: TaskStatus | 'all'; label: string }[] {
  return [
    { value: 'all', label: tr.status.all },
    { value: 'not_started', label: tr.status.notStarted },
    { value: 'in_progress', label: tr.status.inProgress },
    { value: 'done', label: tr.status.done },
  ];
}

function priorityOptions(tr: Translation): { value: Priority | 'all'; label: string }[] {
  return [
    { value: 'all', label: tr.priority.any },
    { value: 'low', label: tr.priority.low },
    { value: 'medium', label: tr.priority.medium },
    { value: 'high', label: tr.priority.high },
  ];
}

function sortOptions(tr: Translation): { value: TaskSortKey; label: string }[] {
  return [
    { value: 'deadline', label: tr.tasksScreen.sortDeadline },
    { value: 'priority', label: tr.tasksScreen.sortPriority },
    { value: 'tag', label: tr.tasksScreen.sortTag },
    { value: 'status', label: tr.tasksScreen.sortStatus },
    { value: 'created', label: tr.tasksScreen.sortCreated },
    { value: 'manual', label: tr.tasksScreen.sortManual },
  ];
}

interface TaskFilterBarProps {
  filters: TaskFilters;
  onChange: (patch: Partial<TaskFilters>) => void;
  availableTags: string[];
}

function Row({ children }: { children: React.ReactNode }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {children}
    </ScrollView>
  );
}

export function TaskFilterBar({ filters, onChange, availableTags }: TaskFilterBarProps) {
  const theme = useTheme();
  const tr = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const activeCount = [filters.status !== 'all', filters.priority !== 'all', filters.tag !== 'all'].filter(Boolean).length;

  function toggleExpanded() {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((v) => !v);
  }

  return (
    <View style={styles.wrapper}>
      <Pressable onPress={toggleExpanded} style={styles.toggleRow}>
        <Text style={[styles.toggleLabel, { color: theme.colors.text }]}>{tr.tasksScreen.filtersLabel}</Text>
        <Badge count={activeCount} color={theme.colors.accent} />
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={theme.colors.textMuted} />
      </Pressable>

      {expanded ? (
        <>
      <Row>
        {statusOptions(tr).map((opt) => (
          <Chip
            key={opt.value}
            label={opt.label}
            selected={filters.status === opt.value}
            onPress={() => onChange({ status: opt.value })}
          />
        ))}
      </Row>
      <Row>
        {priorityOptions(tr).map((opt) => (
          <Chip
            key={opt.value}
            label={opt.label}
            selected={filters.priority === opt.value}
            onPress={() => onChange({ priority: opt.value })}
          />
        ))}
      </Row>
      {availableTags.length > 0 ? (
        <Row>
          <Chip label={tr.tasksScreen.allTags} selected={filters.tag === 'all'} onPress={() => onChange({ tag: 'all' })} />
          {availableTags.map((tag) => (
            <Chip
              key={tag}
              label={`#${tag}`}
              selected={filters.tag === tag}
              onPress={() => onChange({ tag })}
            />
          ))}
        </Row>
      ) : null}
      <Row>
        <Text style={[styles.sortLabel, { color: theme.colors.textMuted }]}>{tr.tasksScreen.sortLabel}</Text>
        {sortOptions(tr).map((opt) => (
          <Chip
            key={opt.value}
            label={opt.label}
            selected={filters.sortBy === opt.value}
            onPress={() => onChange({ sortBy: opt.value })}
          />
        ))}
      </Row>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 8 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 2 },
  toggleLabel: { fontSize: 13, fontWeight: '600' },
  row: { flexDirection: 'row', gap: 6, paddingHorizontal: 2 },
  sortLabel: { fontSize: 12, alignSelf: 'center', marginRight: 2 },
});
