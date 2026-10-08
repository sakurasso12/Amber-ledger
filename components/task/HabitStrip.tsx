import React, { useMemo, useRef } from 'react';
import { Animated, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { parseISO } from 'date-fns';
import { useTheme } from '@/theme/ThemeProvider';
import { cardSurface } from '@/theme/surfaces';
import { SPRING } from '@/theme/motion';
import { useTaskStore } from '@/store/useTaskStore';
import { buildHabits, Habit, HabitMark } from '@/lib/streaks';
import { haptics } from '@/lib/haptics';
import { PressableScale, Text } from '@/components/ui';
import { useTranslation } from '@/i18n';

const DOTS = 7;
const CARD_WIDTH = 116;

/**
 * Habits (recurring tasks with "Count streak" on) as small square cards above the task list:
 * the streak with a flame, the last few times as dots, and a tap to mark today done.
 * Renders nothing when there are no habits.
 */
export function HabitStrip() {
  const tasks = useTaskStore((s) => s.tasks);
  const habits = useMemo(() => buildHabits(tasks), [tasks]);
  if (habits.length === 0) return null;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
      {habits.map((habit) => (
        <HabitCard key={habit.seriesId} habit={habit} />
      ))}
    </ScrollView>
  );
}

function HabitCard({ habit }: { habit: Habit }) {
  const theme = useTheme();
  const tr = useTranslation();
  const router = useRouter();
  const setStatus = useTaskStore((s) => s.setStatus);
  const flame = useRef(new Animated.Value(1)).current;
  const active = habit.streak > 0;

  function handlePress() {
    if (!habit.canCompleteNow || !habit.current) {
      haptics.tap();
      return;
    }
    haptics.success();
    // The flame jumps up and settles back with the app's spring.
    Animated.sequence([
      Animated.spring(flame, { toValue: 1.45, ...SPRING, stiffness: 520, useNativeDriver: true }),
      Animated.spring(flame, { toValue: 1, ...SPRING, useNativeDriver: true }),
    ]).start();
    setStatus(habit.current.id, 'done');
  }

  // Older dots first; empty slots on the left until there's a week of history.
  const dots: (HabitMark | null)[] = [...Array(Math.max(0, DOTS - habit.marks.length)).fill(null), ...habit.marks];
  const dotColor = (mark: HabitMark | null) =>
    mark === 'done' ? theme.colors.primary : mark === 'late' ? `${theme.colors.primary}66` : 'transparent';

  let footer: React.ReactNode;
  if (habit.doneToday) {
    footer = (
      <View style={styles.footerRow}>
        <Ionicons name="checkmark-circle" size={14} color={theme.colors.success} />
        <Text style={[styles.footer, { color: theme.colors.success }]}>{tr.habits.doneToday}</Text>
      </View>
    );
  } else if (habit.canCompleteNow) {
    footer = <Text style={[styles.footer, { color: theme.colors.primary }]}>{tr.habits.markDone}</Text>;
  } else if (habit.nextDueKey) {
    const day = parseISO(habit.nextDueKey).toLocaleDateString(tr.localeCode, { weekday: 'short' });
    footer = <Text style={[styles.footer, { color: theme.colors.textMuted }]}>{tr.habits.next(day)}</Text>;
  }

  return (
    <PressableScale
      onPress={handlePress}
      onLongPress={() => habit.current && router.push(`/task/${habit.current.id}`)}
      scaleTo={0.94}
      style={[styles.card, cardSurface(theme)]}
    >
      <View style={styles.top}>
        <Animated.Text style={[styles.flame, { opacity: active ? 1 : 0.3, transform: [{ scale: flame }] }]}>🔥</Animated.Text>
        <Text style={[styles.count, { color: active ? theme.colors.text : theme.colors.textMuted }]}>{habit.streak}</Text>
      </View>
      <Text style={[styles.title, { color: theme.colors.text }]} numberOfLines={1}>
        {habit.title}
      </Text>
      <View style={styles.dots}>
        {dots.map((mark, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              { backgroundColor: dotColor(mark), borderColor: mark ? theme.colors.primary : theme.colors.border },
              mark === 'missed' && { borderColor: theme.colors.textMuted },
            ]}
          />
        ))}
      </View>
      {footer}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  strip: { paddingHorizontal: 16, gap: 10, paddingBottom: 12 },
  card: { width: CARD_WIDTH, padding: 12, gap: 6 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  flame: { fontSize: 22 },
  count: { fontSize: 26, fontWeight: '800', fontVariant: ['tabular-nums'] },
  title: { fontSize: 13, fontWeight: '600' },
  dots: { flexDirection: 'row', gap: 4 },
  dot: { width: 9, height: 9, borderRadius: 5, borderWidth: 1.5 },
  footerRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  footer: { fontSize: 12, fontWeight: '700' },
});
