import React, { useRef, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { parseISO } from 'date-fns';
import { useTheme } from '@/theme/ThemeProvider';
import { cardSurface } from '@/theme/surfaces';
import { SPRING } from '@/theme/motion';
import { useTaskStore } from '@/store/useTaskStore';
import { Habit, HabitMark } from '@/lib/streaks';
import { haptics } from '@/lib/haptics';
import { PressableScale, Text } from '@/components/ui';
import { useTranslation } from '@/i18n';

const DOTS = 7;
/** Size the card's type was designed at; smaller squares (3 per row) scale everything down. */
const BASE_SIZE = 170;

/**
 * A habit (recurring task with "Count streak" on) as a square: the streak with a flame, the last
 * few times as dots, and a tap to mark today done. While the layout is being edited, taps do nothing.
 */
export function HabitCard({ habit, size, editing = false }: { habit: Habit; size: number; editing?: boolean }) {
  const theme = useTheme();
  const tr = useTranslation();
  const router = useRouter();
  const setStatus = useTaskStore((s) => s.setStatus);
  const flame = useRef(new Animated.Value(1)).current;
  const active = habit.streak > 0;
  const k = Math.min(1.15, Math.max(0.6, size / BASE_SIZE));

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

  // Fills left to right like a progress row: oldest on the left, empty slots after the newest.
  const dots: (HabitMark | null)[] = [...habit.marks, ...Array(Math.max(0, DOTS - habit.marks.length)).fill(null)];
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
      onPress={editing ? undefined : handlePress}
      onLongPress={editing ? undefined : () => habit.current && router.push(`/task/${habit.current.id}`)}
      disabled={editing}
      scaleTo={0.94}
      style={[styles.card, cardSurface(theme), { width: size, height: size, padding: 14 * k, gap: 6 * k }]}
    >
      <View style={styles.top}>
        <Animated.Text style={[styles.flame, { fontSize: 28 * k, opacity: active ? 1 : 0.3, transform: [{ scale: flame }] }]}>🔥</Animated.Text>
        <Text style={[styles.count, { fontSize: 34 * k, color: active ? theme.colors.text : theme.colors.textMuted }]}>{habit.streak}</Text>
      </View>
      <Text style={[styles.title, { fontSize: Math.max(11, 15 * k), color: theme.colors.text }]} numberOfLines={2}>
        {habit.title}
      </Text>
      <View style={styles.spacer} />
      <View style={[styles.dots, { gap: 5 * k }]}>
        {dots.map((mark, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              { width: 10 * k, height: 10 * k, borderRadius: 5 * k },
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
  card: { padding: 14, gap: 6 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  flame: { fontSize: 28 },
  count: { fontSize: 34, fontWeight: '800', fontVariant: ['tabular-nums'] },
  title: { fontSize: 15, fontWeight: '700' },
  spacer: { flex: 1 },
  dots: { flexDirection: 'row', gap: 5 },
  dot: { width: 10, height: 10, borderRadius: 5, borderWidth: 1.5 },
  footerRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  footer: { fontSize: 12, fontWeight: '700' },
});
