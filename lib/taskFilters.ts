import { Task } from '@/types';
import { isHabit } from './streaks';

/**
 * What the Tasks tab shows: everything not done yet, soonest deadline first, tasks without a
 * deadline after them (newest first). Done tasks stay in the database — stats count them.
 * Habits live in their own strip above the list, so they're left out here.
 */
export function activeTasks(tasks: Task[]): Task[] {
  return tasks
    .filter((t) => t.status !== 'done' && !isHabit(t))
    .sort((a, b) => {
      if (a.deadlineAt && b.deadlineAt) return a.deadlineAt.localeCompare(b.deadlineAt);
      if (a.deadlineAt) return -1;
      if (b.deadlineAt) return 1;
      return b.createdAt.localeCompare(a.createdAt);
    });
}
