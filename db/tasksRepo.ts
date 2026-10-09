import { getDb } from './client';
import { generateId } from '@/lib/id';
import { Priority, RecurrenceFreq, SubTask, Task, TaskDraft, TaskStatus } from '@/types';

interface TaskRow {
  id: string;
  title: string;
  description: string;
  deadline_at: string | null;
  priority: Priority;
  status: TaskStatus;
  is_important: number;
  recurrence_freq: string | null;
  recurrence_interval: number | null;
  recurrence_weekdays: string | null;
  recurrence_until: string | null;
  recurrence_streak: number | null;
  series_id: string | null;
  image_uri: string | null;
  sort_order: number;
  expense_category_id: string | null;
  expense_amount: number | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

interface SubtaskRow {
  id: string;
  task_id: string;
  title: string;
  is_done: number;
  sort_order: number;
}

function rowToTask(row: TaskRow, subtasks: SubTask[], tags: string[]): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    deadlineAt: row.deadline_at,
    priority: row.priority,
    status: row.status,
    tags,
    isImportant: row.is_important === 1,
    recurrenceRule: row.recurrence_freq
      ? {
          freq: row.recurrence_freq as RecurrenceFreq,
          interval: row.recurrence_interval ?? 1,
          weekdays: row.recurrence_weekdays ? JSON.parse(row.recurrence_weekdays) : null,
          until: row.recurrence_until,
          streak: row.recurrence_streak === 1,
        }
      : null,
    seriesId: row.series_id,
    imageUri: row.image_uri,
    sortOrder: row.sort_order,
    expenseOnComplete:
      row.expense_category_id && row.expense_amount != null
        ? { categoryId: row.expense_category_id, amount: row.expense_amount }
        : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at,
    subtasks,
  };
}

function rowToSubtask(row: SubtaskRow): SubTask {
  return {
    id: row.id,
    taskId: row.task_id,
    title: row.title,
    isDone: row.is_done === 1,
    sortOrder: row.sort_order,
  };
}

export async function listTasks(): Promise<Task[]> {
  const db = await getDb();
  const taskRows = await db.getAllAsync<TaskRow>('SELECT * FROM tasks ORDER BY created_at DESC');
  const subtaskRows = await db.getAllAsync<SubtaskRow>('SELECT * FROM subtasks ORDER BY sort_order ASC');
  const tagRows = await db.getAllAsync<{ task_id: string; tag: string }>('SELECT task_id, tag FROM task_tags');

  const subtasksByTask = new Map<string, SubTask[]>();
  for (const row of subtaskRows) {
    const list = subtasksByTask.get(row.task_id) ?? [];
    list.push(rowToSubtask(row));
    subtasksByTask.set(row.task_id, list);
  }

  const tagsByTask = new Map<string, string[]>();
  for (const row of tagRows) {
    const list = tagsByTask.get(row.task_id) ?? [];
    list.push(row.tag);
    tagsByTask.set(row.task_id, list);
  }

  return taskRows.map((row) =>
    rowToTask(row, subtasksByTask.get(row.id) ?? [], tagsByTask.get(row.id) ?? [])
  );
}

async function writeTags(taskId: string, tags: string[]): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM task_tags WHERE task_id = ?', [taskId]);
  for (const tag of tags) {
    await db.runAsync('INSERT OR IGNORE INTO task_tags (task_id, tag) VALUES (?, ?)', [taskId, tag]);
  }
}

async function writeSubtasks(taskId: string, subtasks: SubTask[]): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM subtasks WHERE task_id = ?', [taskId]);
  for (const [index, sub] of subtasks.entries()) {
    await db.runAsync(
      'INSERT INTO subtasks (id, task_id, title, is_done, sort_order) VALUES (?, ?, ?, ?, ?)',
      [sub.id, taskId, sub.title, sub.isDone ? 1 : 0, sub.sortOrder ?? index]
    );
  }
}

export async function createTask(draft: TaskDraft): Promise<Task> {
  const db = await getDb();
  const now = new Date().toISOString();
  const maxSortOrder = await db.getFirstAsync<{ max_order: number | null }>('SELECT MAX(sort_order) as max_order FROM tasks');
  const task: Task = {
    id: generateId(),
    title: draft.title,
    description: draft.description,
    deadlineAt: draft.deadlineAt,
    priority: draft.priority,
    status: draft.status,
    tags: draft.tags,
    isImportant: draft.isImportant,
    recurrenceRule: draft.recurrenceRule,
    seriesId: null,
    imageUri: draft.imageUri,
    sortOrder: (maxSortOrder?.max_order ?? -1) + 1,
    expenseOnComplete: draft.expenseOnComplete,
    createdAt: now,
    updatedAt: now,
    completedAt: draft.status === 'done' ? now : null,
    subtasks: draft.subtasks.map((s, index) => ({
      id: generateId(),
      taskId: '',
      title: s.title,
      isDone: s.isDone,
      sortOrder: s.sortOrder ?? index,
    })),
  };
  task.subtasks = task.subtasks.map((s) => ({ ...s, taskId: task.id }));

  await db.runAsync(
    `INSERT INTO tasks (
      id, title, description, deadline_at, priority, status, is_important,
      recurrence_freq, recurrence_interval, recurrence_weekdays, recurrence_until, recurrence_streak,
      series_id, image_uri, sort_order, expense_category_id, expense_amount,
      created_at, updated_at, completed_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      task.id,
      task.title,
      task.description,
      task.deadlineAt,
      task.priority,
      task.status,
      task.isImportant ? 1 : 0,
      task.recurrenceRule?.freq ?? null,
      task.recurrenceRule?.interval ?? null,
      task.recurrenceRule?.weekdays ? JSON.stringify(task.recurrenceRule.weekdays) : null,
      task.recurrenceRule?.until ?? null,
      task.recurrenceRule?.streak ? 1 : 0,
      task.seriesId,
      task.imageUri,
      task.sortOrder,
      task.expenseOnComplete?.categoryId ?? null,
      task.expenseOnComplete?.amount ?? null,
      task.createdAt,
      task.updatedAt,
      task.completedAt,
    ]
  );

  await writeTags(task.id, task.tags);
  await writeSubtasks(task.id, task.subtasks);

  return task;
}


/** As a recurring task's next instance: same shape as the source, fresh id/dates, linked by seriesId. */
export async function createNextRecurringInstance(source: Task, deadlineAt: string): Promise<Task> {
  const db = await getDb();
  const task = await createTask({
    title: source.title,
    description: source.description,
    deadlineAt,
    priority: source.priority,
    status: 'not_started',
    tags: source.tags,
    isImportant: source.isImportant,
    recurrenceRule: source.recurrenceRule,
    imageUri: null,
    expenseOnComplete: source.expenseOnComplete,
    subtasks: source.subtasks.map((s) => ({ title: s.title, isDone: false, sortOrder: s.sortOrder })),
  });

  const seriesId = source.seriesId ?? source.id;
  await db.runAsync('UPDATE tasks SET series_id = ? WHERE id = ?', [seriesId, task.id]);
  return { ...task, seriesId };
}

export async function updateTask(task: Task): Promise<void> {
  const db = await getDb();
  const updatedAt = new Date().toISOString();

  await db.runAsync(
    `UPDATE tasks SET
      title = ?, description = ?, deadline_at = ?, priority = ?, status = ?, is_important = ?,
      recurrence_freq = ?, recurrence_interval = ?, recurrence_weekdays = ?, recurrence_until = ?, recurrence_streak = ?,
      series_id = ?, image_uri = ?, expense_category_id = ?, expense_amount = ?, updated_at = ?, completed_at = ?
    WHERE id = ?`,
    [
      task.title,
      task.description,
      task.deadlineAt,
      task.priority,
      task.status,
      task.isImportant ? 1 : 0,
      task.recurrenceRule?.freq ?? null,
      task.recurrenceRule?.interval ?? null,
      task.recurrenceRule?.weekdays ? JSON.stringify(task.recurrenceRule.weekdays) : null,
      task.recurrenceRule?.until ?? null,
      task.recurrenceRule?.streak ? 1 : 0,
      task.seriesId,
      task.imageUri,
      task.expenseOnComplete?.categoryId ?? null,
      task.expenseOnComplete?.amount ?? null,
      updatedAt,
      task.completedAt,
      task.id,
    ]
  );

  await writeTags(task.id, task.tags);
  await writeSubtasks(task.id, task.subtasks);
}

export async function deleteTask(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM tasks WHERE id = ?', [id]);
}

export async function setSubtaskDone(subtaskId: string, isDone: boolean): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE subtasks SET is_done = ? WHERE id = ?', [isDone ? 1 : 0, subtaskId]);
}
