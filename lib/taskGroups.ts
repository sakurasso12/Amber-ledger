import { addDays, startOfDay } from 'date-fns';
import { Task } from '@/types';
import { toDateKey } from './dateRanges';

export type TaskBucket = 'overdue' | 'today' | 'tomorrow' | 'later' | 'noDeadline';
export const BUCKET_ORDER: TaskBucket[] = ['overdue', 'today', 'tomorrow', 'later', 'noDeadline'];

/** Which "when" section a task falls into, relative to `now`. */
export function taskBucket(task: Task, now: Date = new Date()): TaskBucket {
  if (!task.deadlineAt) return 'noDeadline';
  const deadline = new Date(task.deadlineAt);
  if (deadline.getTime() < now.getTime()) return 'overdue';
  const todayStart = startOfDay(now);
  if (deadline < addDays(todayStart, 1)) return 'today';
  if (deadline < addDays(todayStart, 2)) return 'tomorrow';
  return 'later';
}

/** Tasks grouped into non-empty "when" sections, in BUCKET_ORDER, keeping the given order inside. */
export function groupTasksByBucket(tasks: Task[], now: Date = new Date()): { bucket: TaskBucket; tasks: Task[] }[] {
  const map = new Map<TaskBucket, Task[]>();
  for (const task of tasks) {
    const bucket = taskBucket(task, now);
    map.set(bucket, [...(map.get(bucket) ?? []), task]);
  }
  return BUCKET_ORDER.filter((b) => map.has(b)).map((bucket) => ({ bucket, tasks: map.get(bucket)! }));
}

/** Tasks grouped by deadline day (yyyy-MM-dd), with deadline-less tasks last under key null. */
export function groupTasksByDay(tasks: Task[]): { day: string | null; tasks: Task[] }[] {
  const map = new Map<string | null, Task[]>();
  for (const task of tasks) {
    const day = task.deadlineAt ? toDateKey(new Date(task.deadlineAt)) : null;
    map.set(day, [...(map.get(day) ?? []), task]);
  }
  const days = [...map.keys()].filter((d): d is string => d !== null).sort();
  const groups: { day: string | null; tasks: Task[] }[] = days.map((day) => ({ day, tasks: map.get(day)! }));
  if (map.has(null)) groups.push({ day: null, tasks: map.get(null)! });
  return groups;
}
