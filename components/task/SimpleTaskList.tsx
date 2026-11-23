import React, { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { addDays } from 'date-fns';
import { Text } from '@/components/ui/Text';
import { EmptyState } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';
import { cardSurface } from '@/theme/surfaces';
import { useTaskStore } from '@/store/useTaskStore';
import { activeTasks } from '@/lib/taskFilters';
import { toDateKey, todayKey } from '@/lib/dateRanges';
import { haptics } from '@/lib/haptics';
import { useTranslation } from '@/i18n';
import { Task } from '@/types';

/**
 * Simple mode's Tasks (1.8): the to-dos in plain sections — Today (with what's overdue and what was
 * already done today), Tomorrow, Later, No date — each a big row with a big tick box.
 */
export function SimpleTaskList() {
  const theme = useTheme();
  const tr = useTranslation();
  const t = tr.uiMode;
  const router = useRouter();
  const tasks = useTaskStore((s) => s.tasks);
  const setStatus = useTaskStore((s) => s.setStatus);

  const sections = useMemo(() => {
    const today = todayKey();
    const tomorrow = toDateKey(addDays(new Date(), 1));
    const open = activeTasks(tasks);
    const dayOf = (task: Task) => (task.deadlineAt ? toDateKey(new Date(task.deadlineAt)) : null);
    const doneToday = tasks.filter((task) => task.status === 'done' && task.completedAt && toDateKey(new Date(task.completedAt)) === today);
    return [
      { key: 'today', title: t.today, items: [...open.filter((task) => { const d = dayOf(task); return d !== null && d <= today; }), ...doneToday] },
      { key: 'tomorrow', title: t.tomorrow, items: open.filter((task) => dayOf(task) === tomorrow) },
      { key: 'later', title: t.later, items: open.filter((task) => { const d = dayOf(task); return d !== null && d > tomorrow; }) },
      { key: 'nodate', title: t.noDate, items: open.filter((task) => dayOf(task) === null) },
    ].filter((s) => s.items.length > 0);
  }, [tasks, t]);

  if (sections.length === 0) {
    return <EmptyState icon="📋" title={tr.tasksScreen.emptyTitle} subtitle={t.emptyTasks} />;
  }

  const now = Date.now();
  const when = (task: Task) => {
    if (task.status === 'done') return { text: t.done, late: false };
    if (!task.deadlineAt) return { text: '', late: false };
    const d = new Date(task.deadlineAt);
    const late = d.getTime() < now;
    const time = d.toLocaleTimeString(tr.localeCode, { hour: '2-digit', minute: '2-digit' });
    const date = d.toLocaleDateString(tr.localeCode, { day: 'numeric', month: 'long' });
    const sameDay = toDateKey(d) === todayKey();
    return { text: late ? t.overdue(sameDay ? time : date) : sameDay ? time : `${date}, ${time}`, late };
  };

  return (
    <View style={styles.wrap}>
      {sections.map((section) => (
        <View key={section.key} style={[styles.card, cardSurface(theme)]}>
          <Text style={[styles.section, { color: theme.colors.textMuted }]}>{section.title}</Text>
          {section.items.map((task, i) => {
            const done = task.status === 'done';
            const w = when(task);
            return (
              <View key={task.id} style={[styles.row, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.border }]}>
                <Pressable
                  onPress={() => {
                    haptics.tap();
                    if (!done) haptics.success();
                    setStatus(task.id, done ? 'not_started' : 'done');
                  }}
                  hitSlop={10}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: done }}
                  accessibilityLabel={task.title}
                  style={[
                    styles.box,
                    done ? { backgroundColor: theme.colors.success, borderColor: theme.colors.success } : { borderColor: theme.colors.textMuted },
                  ]}
                >
                  {done ? <Ionicons name="checkmark" size={22} color="#fff" /> : null}
                </Pressable>
                <Pressable style={styles.body} onPress={() => router.push(`/task/${task.id}`)}>
                  <Text
                    style={[styles.title, { color: done ? theme.colors.textMuted : theme.colors.text }, done && styles.strike]}
                    numberOfLines={2}
                  >
                    {task.title}
                  </Text>
                  {w.text ? <Text style={[styles.when, { color: w.late ? theme.colors.danger : theme.colors.textMuted }]}>{w.text}</Text> : null}
                </Pressable>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 14 },
  card: { borderRadius: 18, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 10 },
  section: { fontSize: 14, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12 },
  box: { width: 32, height: 32, borderRadius: 10, borderWidth: 2.5, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, gap: 2 },
  title: { fontSize: 18, fontWeight: '600' },
  strike: { textDecorationLine: 'line-through' },
  when: { fontSize: 14 },
});
