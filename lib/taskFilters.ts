import { Task } from '@/types';

/**
 * What the Tasks tab shows: everything not done yet, soonest deadline first, tasks without a
 * deadline after them (newest first). Done tasks stay in the database — stats count them.
 */
export function activeTasks(tasks: Task[]): Task[] {
  return tasks
    .filter((t) => t.status !== 'done')
    .sort((a, b) => {
      if (a.deadlineAt && b.deadlineAt) return a.deadlineAt.localeCompare(b.deadlineAt);
      if (a.deadlineAt) return -1;
      if (b.deadlineAt) return 1;
      return b.createdAt.localeCompare(a.createdAt);
    });
}
