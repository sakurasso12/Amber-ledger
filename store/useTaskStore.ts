import { create } from 'zustand';
import * as tasksRepo from '@/db/tasksRepo';
import { nextOccurrence } from '@/lib/recurrence';
import { isHabit, isOnOrBeforeToday } from '@/lib/streaks';
import { refreshHomeWidget } from '@/lib/widgetRefresh';
import { playDoneSound } from '@/lib/sounds';
import { cancelTaskReminder, clearStickyNotification, syncStickyNotification, syncTaskReminder } from '@/notifications';
import { useSettingsStore } from './useSettingsStore';
import { useFinanceStore } from './useFinanceStore';
import { Task, TaskDraft, TaskStatus } from '@/types';

function syncNotificationsFor(task: Task): void {
  const { reminderMinutesBefore } = useSettingsStore.getState().settings;
  syncTaskReminder(task, reminderMinutesBefore);
  syncStickyNotification(task);
}

interface TaskState {
  tasks: Task[];
  isLoaded: boolean;
  load: () => Promise<void>;
  addTask: (draft: TaskDraft) => Promise<void>;
  editTask: (task: Task) => Promise<void>;
  removeTask: (id: string) => Promise<void>;
  toggleSubtask: (taskId: string, subtaskId: string) => Promise<void>;
  setStatus: (taskId: string, status: TaskStatus) => Promise<void>;
  resyncAllReminders: () => void;
}

export const useTaskStore = create<TaskState>()((set, get) => ({
  tasks: [],
  isLoaded: false,

  load: async () => {
    const tasks = await tasksRepo.listTasks();
    set({ tasks, isLoaded: true });
  },

  addTask: async (draft) => {
    const task = await tasksRepo.createTask(draft);
    set((state) => ({ tasks: [task, ...state.tasks] }));
    syncNotificationsFor(task);
  },

  editTask: async (task) => {
    const before = get().tasks.find((t) => t.id === task.id);
    // A status change from the editor goes through setStatus like a tap on the circle does: sound,
    // the logged expense (or taking it back), the next time of a repeating task, widgets.
    const statusChanged = !!before && before.status !== task.status;
    const saved = statusChanged ? { ...task, status: before!.status, completedAt: before!.completedAt } : task;
    await tasksRepo.updateTask(saved);
    set((state) => ({ tasks: state.tasks.map((t) => (t.id === task.id ? saved : t)) }));
    syncNotificationsFor(saved);
    if (statusChanged) await get().setStatus(task.id, task.status);
  },

  removeTask: async (id) => {
    // A done task that logged an expense takes it back with it — the money returns to the bank.
    await removeTaskExpenses(id);
    await tasksRepo.deleteTask(id);
    set((state) => ({ tasks: state.tasks.filter((t) => t.id !== id) }));
    cancelTaskReminder(id);
    clearStickyNotification(id);
  },

  toggleSubtask: async (taskId, subtaskId) => {
    const task = get().tasks.find((t) => t.id === taskId);
    if (!task) return;
    const subtask = task.subtasks.find((s) => s.id === subtaskId);
    if (!subtask) return;

    const nextDone = !subtask.isDone;
    await tasksRepo.setSubtaskDone(subtaskId, nextDone);
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === taskId
          ? { ...t, subtasks: t.subtasks.map((s) => (s.id === subtaskId ? { ...s, isDone: nextDone } : s)) }
          : t
      ),
    }));
  },

  setStatus: async (taskId, status) => {
    const task = get().tasks.find((t) => t.id === taskId);
    // Same status again (e.g. swiping an already done task in the Calendar archive): nothing to do —
    // otherwise a repeating task would get a second "next time".
    if (!task || task.status === status) return;

    const now = new Date().toISOString();
    const updated: Task = {
      ...task,
      status,
      completedAt: status === 'done' ? now : null,
    };
    if (status === 'done' && task.status !== 'done') playDoneSound();
    await tasksRepo.updateTask(updated);
    set((state) => ({ tasks: state.tasks.map((t) => (t.id === taskId ? updated : t)) }));
    syncNotificationsFor(updated);

    // Un-done: the expense its completion logged is taken back.
    if (task.status === 'done' && status !== 'done') await removeTaskExpenses(taskId);

    // The next time of a repeating task — unless it already exists (done, re-opened, done again).
    const seriesKey = task.seriesId ?? task.id;
    const hasNext = get().tasks.some(
      (t) => t.id !== task.id && (t.seriesId ?? t.id) === seriesKey && t.status !== 'done' && (t.deadlineAt ?? '') > (task.deadlineAt ?? '')
    );
    if (status === 'done' && task.recurrenceRule && !hasNext) {
      let deadlineAt = nextOccurrence(task.recurrenceRule, task.deadlineAt);
      // A habit done late covers today too, so its next time is the first one after today.
      while (deadlineAt && isHabit(task) && isOnOrBeforeToday(deadlineAt)) {
        deadlineAt = nextOccurrence(task.recurrenceRule, deadlineAt);
      }
      if (deadlineAt) {
        const nextTask = await tasksRepo.createNextRecurringInstance(task, deadlineAt);
        set((state) => ({ tasks: [nextTask, ...state.tasks] }));
        syncNotificationsFor(nextTask);
      }
    }

    // Home screen widgets (next task, streaks) show this right away instead of on the next tick.
    refreshHomeWidget();

    if (status === 'done' && task.expenseOnComplete) {
      useFinanceStore.getState().addExpense({
        amount: task.expenseOnComplete.amount,
        categoryId: task.expenseOnComplete.categoryId,
        date: now.slice(0, 10),
        comment: task.title,
        taskId: task.id,
      });
    }
  },

  /** Re-schedules every task's reminder/sticky notification — call once permission is granted,
   * since tasks created before that point were silently skipped. */
  resyncAllReminders: () => {
    for (const task of get().tasks) syncNotificationsFor(task);
  },
}));

/** Deletes the expenses a task's completion logged (through the finance store, so the bank follows). */
async function removeTaskExpenses(taskId: string): Promise<void> {
  const finance = useFinanceStore.getState();
  for (const expense of finance.expenses.filter((e) => e.taskId === taskId)) {
    await finance.removeExpense(expense.id);
  }
}
