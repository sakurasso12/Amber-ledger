import { Task, TaskFilters } from '@/types';

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };
const STATUS_ORDER = { not_started: 0, in_progress: 1, done: 2 };

export function applyTaskFilters(tasks: Task[], filters: TaskFilters): Task[] {
  let result = tasks;

  // Completed tasks drop out of the list right away; they stay in the database (stats count them)
  // and can still be seen with the "Done" status filter.
  if (filters.status === 'all') {
    result = result.filter((t) => t.status !== 'done');
  } else {
    result = result.filter((t) => t.status === filters.status);
  }
  if (filters.priority !== 'all') {
    result = result.filter((t) => t.priority === filters.priority);
  }
  if (filters.tag !== 'all') {
    result = result.filter((t) => t.tags.includes(filters.tag));
  }

  const sorted = [...result].sort((a, b) => {
    switch (filters.sortBy) {
      case 'deadline':
        if (!a.deadlineAt && !b.deadlineAt) return 0;
        if (!a.deadlineAt) return 1;
        if (!b.deadlineAt) return -1;
        return a.deadlineAt.localeCompare(b.deadlineAt);
      case 'priority':
        return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
      case 'tag':
        return (a.tags[0] ?? '').localeCompare(b.tags[0] ?? '');
      case 'status':
        return STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
      case 'created':
        return b.createdAt.localeCompare(a.createdAt);
      case 'manual':
        return a.sortOrder - b.sortOrder;
      default:
        return 0;
    }
  });

  return sorted;
}

export function uniqueTags(tasks: Task[]): string[] {
  const set = new Set<string>();
  for (const task of tasks) {
    for (const tag of task.tags) set.add(tag);
  }
  return [...set].sort();
}
