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
    // Marked done from the editor's status switch counts as completing it too.
    if (task.status === 'done' && get().tasks.find((t) => t.id === task.id)?.status !== 'done') playDoneSound();
    await tasksRepo.updateTask(task);
    set((state) => ({ tasks: state.tasks.map((t) => (t.id === task.id ? task : t)) }));
    syncNotificationsFor(task);
  },

  removeTask: async (id) => {
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
    if (!task) return;

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

    if (status === 'done' && task.recurrenceRule) {
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
      });
    }
  },

  /** Re-schedules every task's reminder/sticky notification — call once permission is granted,
   * since tasks created before that point were silently skipped. */
  resyncAllReminders: () => {
    for (const task of get().tasks) syncNotificationsFor(task);
  },
}));
