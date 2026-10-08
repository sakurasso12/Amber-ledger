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
const GAP = 10;

/**
 * Habits (recurring tasks with "Count streak" on) as square cards, two per row, at the top of the
 * task list: the streak with a flame, the last few times as dots, and a tap to mark today done.
 * Renders nothing when there are no habits.
 */
export function HabitGrid({ habits }: { habits: Habit[] }) {
  // Measured, so the squares fit both layouts (Vertical has the title rail on the left).
  const [width, setWidth] = useState(0);
  if (habits.length === 0) return null;
  const size = Math.floor((width - GAP) / 2);

  return (
    <View style={styles.grid} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 ? habits.map((habit) => <HabitCard key={habit.seriesId} habit={habit} size={size} />) : null}
    </View>
  );
}

function HabitCard({ habit, size }: { habit: Habit; size: number }) {
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
      onPress={handlePress}
      onLongPress={() => habit.current && router.push(`/task/${habit.current.id}`)}
      scaleTo={0.94}
      style={[styles.card, cardSurface(theme), { width: size, height: size }]}
    >
      <View style={styles.top}>
        <Animated.Text style={[styles.flame, { opacity: active ? 1 : 0.3, transform: [{ scale: flame }] }]}>🔥</Animated.Text>
        <Text style={[styles.count, { color: active ? theme.colors.text : theme.colors.textMuted }]}>{habit.streak}</Text>
      </View>
      <Text style={[styles.title, { color: theme.colors.text }]} numberOfLines={2}>
        {habit.title}
      </Text>
      <View style={styles.spacer} />
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
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP },
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
