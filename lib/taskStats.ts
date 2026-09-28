import { Task } from '@/types';
import { DateRange, isDateKeyInRange, toDateKey } from './dateRanges';

export interface WeekTaskStats {
  label: string;
  created: number;
  completed: number;
  overdue: number;
}

export function weeklyTaskStats(tasks: Task[], weeks: DateRange[]): WeekTaskStats[] {
  const now = new Date();

  return weeks.map((range) => {
    const created = tasks.filter((t) => isDateKeyInRange(toDateKey(new Date(t.createdAt)), range)).length;
    const completed = tasks.filter(
      (t) => t.completedAt && isDateKeyInRange(toDateKey(new Date(t.completedAt)), range)
    ).length;
    const overdue = tasks.filter(
      (t) =>
        t.deadlineAt &&
        t.status !== 'done' &&
        isDateKeyInRange(toDateKey(new Date(t.deadlineAt)), range) &&
        new Date(t.deadlineAt) < now
    ).length;

    return {
      label: `${range.start.getDate()}.${range.start.getMonth() + 1}`,
      created,
      completed,
      overdue,
    };
  });
}
