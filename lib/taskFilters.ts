import { Task } from '@/types';
import { isHabit } from './streaks';

/**
 * What the Tasks tab shows: everything not done yet, soonest deadline first, tasks without a
 * deadline after them (newest first). Done tasks stay in the database — stats count them.
 * Habits live in their own strip above the list, so they're left out here.
 */
/** Key that stays the same across a recurring task's instances — sizes and the manual order use it. */
export const taskKey = (task: Task) => task.seriesId ?? task.id;

/**
 * The user's own order. Tasks it doesn't know yet (just created) go on top, by deadline among
 * themselves, so nothing new hides at the bottom.
 */
export function manualOrder(tasks: Task[], order: string[]): Task[] {
  const rank = new Map(order.map((key, i) => [key, i]));
  const fresh = tasks.filter((t) => !rank.has(taskKey(t)));
  const known = tasks.filter((t) => rank.has(taskKey(t))).sort((a, b) => rank.get(taskKey(a))! - rank.get(taskKey(b))!);
  return [...fresh, ...known];
}

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
