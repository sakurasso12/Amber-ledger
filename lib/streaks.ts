import { parseISO, setHours, setMinutes, startOfDay, addDays } from 'date-fns';
import { RecurrenceRule, Task } from '@/types';
import { toDateKey, todayKey } from './dateRanges';

/** A recurring task with "Count streak" on lives in the habit strip instead of the task list. */
export function isHabit(task: Task): boolean {
  return !!task.recurrenceRule?.streak && task.recurrenceRule.freq !== 'monthly';
}

/** Monthly repeats ("pay rent") aren't habits, so the streak switch only exists for these. */
export function canCountStreak(rule: RecurrenceRule | null): boolean {
  return !!rule && rule.freq !== 'monthly';
}

/** One dot in the "last few times" row. */
export type HabitMark = 'done' | 'late' | 'missed';

export interface Habit {
  seriesId: string;
  title: string;
  /** The instance waiting to be done (today's or the next scheduled one); null if the series ended. */
  current: Task | null;
  streak: number;
  /** Oldest first, at most 7. */
  marks: HabitMark[];
  doneToday: boolean;
  /** Current instance is due today or overdue, so tapping the card completes it. */
  canCompleteNow: boolean;
  /** yyyy-MM-dd of the next time it's due, when that's after today. */
  nextDueKey: string | null;
}

const dayKey = (iso: string) => toDateKey(parseISO(iso));

/**
 * Streak rules (the user's):
 * - only scheduled days count — a Mon/Thu habit isn't broken by Tuesday;
 * - done on its day: +1; a scheduled day that passed undone: the streak is 0;
 * - today not done yet doesn't break anything until the day is over;
 * - done late: counts as a fresh start (1), the older streak is gone.
 */
export function buildHabits(tasks: Task[], now: Date = new Date()): Habit[] {
  const today = toDateKey(now);
  // Group every task by its series; a series is a habit when its newest instance has the switch
  // on. Older instances (from before the switch was flipped) still count towards the history.
  const series = new Map<string, Task[]>();
  for (const task of tasks) {
    if (!task.recurrenceRule && !task.seriesId) continue;
    const id = task.seriesId ?? task.id;
    const list = series.get(id) ?? [];
    list.push(task);
    series.set(id, list);
  }

  const habits: Habit[] = [];
  for (const [seriesId, list] of series) {
    const sorted = [...list]
      .filter((t) => t.deadlineAt)
      .sort((a, b) => a.deadlineAt!.localeCompare(b.deadlineAt!));
    if (sorted.length === 0 || !isHabit(sorted[sorted.length - 1])) continue;

    const open = sorted.filter((t) => t.status !== 'done');
    const current = open[0] ?? null;
    const done = sorted.filter((t) => t.status === 'done' && t.completedAt);

    // Walk back from the newest occurrence.
    let streak = 0;
    for (let i = sorted.length - 1; i >= 0; i--) {
      const t = sorted[i];
      const due = dayKey(t.deadlineAt!);
      if (t.status !== 'done') {
        if (due < today) break; // a scheduled day passed undone
        continue; // today's or a future one — not decided yet
      }
      streak++;
      if (t.completedAt && dayKey(t.completedAt) > due) break; // done late = restart here
    }

    const marks: HabitMark[] = sorted
      .filter((t) => t.status === 'done' || dayKey(t.deadlineAt!) < today)
      .slice(-7)
      .map((t) => (t.status !== 'done' ? 'missed' : dayKey(t.completedAt ?? t.deadlineAt!) > dayKey(t.deadlineAt!) ? 'late' : 'done'));

    const currentDue = current ? dayKey(current.deadlineAt!) : null;
    habits.push({
      seriesId,
      title: (current ?? sorted[sorted.length - 1]).title,
      current,
      streak,
      marks,
      doneToday: done.some((t) => dayKey(t.completedAt!) === today),
      canCompleteNow: !!currentDue && currentDue <= today,
      nextDueKey: currentDue && currentDue > today ? currentDue : null,
    });
  }

  // Due today first, then the longest streaks.
  return habits.sort((a, b) => Number(b.canCompleteNow) - Number(a.canCompleteNow) || b.streak - a.streak);
}

/**
 * Habits need a deadline to schedule from. When none was picked, use the first scheduled day
 * from today on (end of that day).
 */
export function firstHabitDeadline(rule: RecurrenceRule, now: Date = new Date()): string {
  let day = startOfDay(now);
  if (rule.freq === 'weekly' && rule.weekdays && rule.weekdays.length > 0) {
    for (let i = 0; i < 7 && !rule.weekdays.includes(day.getDay()); i++) day = addDays(day, 1);
  }
  return setMinutes(setHours(day, 23), 59).toISOString();
}

/** After completing a habit late, the next occurrence must land after today — today is covered. */
export function isOnOrBeforeToday(iso: string): boolean {
  return dayKey(iso) <= todayKey();
}
