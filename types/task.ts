export type Priority = 'low' | 'medium' | 'high';

export type TaskStatus = 'not_started' | 'in_progress' | 'done';

export type RecurrenceFreq = 'daily' | 'weekly' | 'monthly';

export interface RecurrenceRule {
  freq: RecurrenceFreq;
  /** Every N days/weeks/months, depending on freq. Defaults to 1. */
  interval: number;
  /** 0 (Sunday) - 6 (Saturday). Only used when freq === 'weekly'. */
  weekdays: number[] | null;
  /** ISO date string; recurrence stops producing new instances after this date. */
  until: string | null;
  /** Count a streak for this series and show it as a habit card instead of in the task list. */
  streak?: boolean;
}

export interface SubTask {
  id: string;
  taskId: string;
  title: string;
  isDone: boolean;
  sortOrder: number;
}

/** What logging an expense automatically when a task is completed should record. */
export interface ExpenseOnComplete {
  categoryId: string;
  amount: number;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  /** ISO datetime string, or null if no deadline is set. */
  deadlineAt: string | null;
  priority: Priority;
  status: TaskStatus;
  tags: string[];
  isImportant: boolean;
  recurrenceRule: RecurrenceRule | null;
  /** Id of the task this instance was generated from, if it belongs to a recurring series. */
  seriesId: string | null;
  /** Local file:// URI of an attached photo, or null. */
  imageUri: string | null;
  /** Creation order (max existing + 1). Kept in the database; the list itself sorts by deadline. */
  sortOrder: number;
  /** If set, completing this task logs a matching expense automatically. */
  expenseOnComplete: ExpenseOnComplete | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  subtasks: SubTask[];
}

export interface TaskDraft {
  title: string;
  description: string;
  deadlineAt: string | null;
  priority: Priority;
  status: TaskStatus;
  tags: string[];
  isImportant: boolean;
  recurrenceRule: RecurrenceRule | null;
  imageUri: string | null;
  expenseOnComplete: ExpenseOnComplete | null;
  subtasks: Omit<SubTask, 'id' | 'taskId'>[];
}
