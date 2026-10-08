import { Task } from '@/types';

/** Tasks per level: the ring has this many segments, and every full ring is a new level. */
export const TASKS_PER_LEVEL = 10;

/** Every task ever marked done (habit check-ins included — each one is its own task). */
export function completedCount(tasks: Task[]): number {
  return tasks.reduce((n, t) => n + (t.status === 'done' ? 1 : 0), 0);
}

/** "2/10", then "10/20", "20/30"… — done so far / where the current ring ends. */
export function levelLabel(total: number): string {
  return `${total}/${(Math.floor(total / TASKS_PER_LEVEL) + 1) * TASKS_PER_LEVEL}`;
}

export const levelOf = (total: number) => Math.floor(total / TASKS_PER_LEVEL);
export const segmentsFilled = (total: number) => total % TASKS_PER_LEVEL;
