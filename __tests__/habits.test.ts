import { buildHabits } from '@/lib/streaks';
import { completedCount, levelLabel, segmentsFilled } from '@/lib/level';
import { RecurrenceRule } from '@/types';
import { task } from './factories';

const daily: RecurrenceRule = { freq: 'daily', interval: 1, weekdays: null, until: null, streak: true };
const NOW = new Date('2026-10-13T12:00:00');

/** One occurrence of the daily habit "Read" on `day`. */
const day = (d: string, done: 'onTime' | 'late' | 'no', id = d) =>
  task({
    id,
    seriesId: 'read',
    title: 'Read',
    recurrenceRule: daily,
    deadlineAt: `${d}T23:59:00`,
    status: done === 'no' ? 'not_started' : 'done',
    completedAt: done === 'onTime' ? `${d}T20:00:00` : done === 'late' ? '2026-10-13T09:00:00' : null,
  });

describe('streaks', () => {
  it('counts the days done on their day; today still open breaks nothing', () => {
    const [habit] = buildHabits([day('2026-10-10', 'onTime'), day('2026-10-11', 'onTime'), day('2026-10-12', 'onTime'), day('2026-10-13', 'no')], NOW);
    expect(habit.streak).toBe(3);
  });

  it('a scheduled day that passed undone resets the streak', () => {
    const [habit] = buildHabits([day('2026-10-10', 'onTime'), day('2026-10-11', 'no'), day('2026-10-12', 'onTime'), day('2026-10-13', 'no')], NOW);
    expect(habit.streak).toBe(1);
  });

  it('done late counts as a fresh start', () => {
    const [habit] = buildHabits([day('2026-10-10', 'onTime'), day('2026-10-11', 'onTime'), day('2026-10-12', 'late')], NOW);
    expect(habit.streak).toBe(1);
  });
});

describe('level ring', () => {
  it('shows done / where the ring ends', () => {
    expect(levelLabel(2)).toBe('2/10');
    expect(levelLabel(10)).toBe('10/20');
    expect(segmentsFilled(23)).toBe(3);
  });

  it('counts every task ever done', () => {
    expect(completedCount([task({ status: 'done' }), task({ id: 't2' }), task({ id: 't3', status: 'done' })])).toBe(2);
  });
});
