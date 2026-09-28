import { create } from 'zustand';
import * as tasksRepo from '@/db/tasksRepo';
import { nextOccurrence } from '@/lib/recurrence';
import { cancelTaskReminder, clearStickyNotification, syncStickyNotification, syncTaskReminder } from '@/notifications';
import { useSettingsStore } from './useSettingsStore';
import { useFinanceStore } from './useFinanceStore';
import { Task, TaskDraft, TaskFilters, TaskStatus } from '@/types';

function syncNotificationsFor(task: Task): void {
  const { reminderMinutesBefore } = useSettingsStore.getState().settings;
  syncTaskReminder(task, reminderMinutesBefore);
  syncStickyNotification(task);
}

interface TaskState {
  tasks: Task[];
  isLoaded: boolean;
  filters: TaskFilters;
  load: () => Promise<void>;
  addTask: (draft: TaskDraft) => Promise<void>;
  editTask: (task: Task) => Promise<void>;
  removeTask: (id: string) => Promise<void>;
  toggleSubtask: (taskId: string, subtaskId: string) => Promise<void>;
  setStatus: (taskId: string, status: TaskStatus) => Promise<void>;
  setFilters: (patch: Partial<TaskFilters>) => void;
  resyncAllReminders: () => void;
  reorderTasks: (orderedTasks: Task[]) => Promise<void>;
}

const defaultFilters: TaskFilters = {
  status: 'all',
  priority: 'all',
  tag: 'all',
  sortBy: 'deadline',
};

export const useTaskStore = create<TaskState>()((set, get) => ({
  tasks: [],
  isLoaded: false,
  filters: defaultFilters,

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
    await tasksRepo.updateTask(updated);
    set((state) => ({ tasks: state.tasks.map((t) => (t.id === taskId ? updated : t)) }));
    syncNotificationsFor(updated);

    if (status === 'done' && task.recurrenceRule) {
      const deadlineAt = nextOccurrence(task.recurrenceRule, task.deadlineAt);
      if (deadlineAt) {
        const nextTask = await tasksRepo.createNextRecurringInstance(task, deadlineAt);
        set((state) => ({ tasks: [nextTask, ...state.tasks] }));
        syncNotificationsFor(nextTask);
      }
    }

    if (status === 'done' && task.expenseOnComplete) {
      useFinanceStore.getState().addExpense({
        amount: task.expenseOnComplete.amount,
        categoryId: task.expenseOnComplete.categoryId,
        date: now.slice(0, 10),
        comment: task.title,
      });
    }
  },

  setFilters: (patch) => set((state) => ({ filters: { ...state.filters, ...patch } })),

  /** Re-schedules every task's reminder/sticky notification — call once permission is granted,
   * since tasks created before that point were silently skipped. */
  resyncAllReminders: () => {
    for (const task of get().tasks) syncNotificationsFor(task);
  },

  /** Persists a drag-and-drop reorder. `orderedTasks` may be a filtered subset of the full list
   * (whatever was visible while dragging) — the subset's existing sort_order slots are reused in
   * their new order, so reordering a filtered view doesn't disturb where hidden tasks fall. */
  reorderTasks: async (orderedTasks) => {
    const visibleIds = new Set(orderedTasks.map((t) => t.id));
    const slots = get()
      .tasks.filter((t) => visibleIds.has(t.id))
      .map((t) => t.sortOrder)
      .sort((a, b) => a - b);

    const entries = orderedTasks.map((t, i) => ({ id: t.id, sortOrder: slots[i] }));
    const sortOrderById = new Map(entries.map((e) => [e.id, e.sortOrder]));

    set((state) => ({
      tasks: state.tasks.map((t) => (sortOrderById.has(t.id) ? { ...t, sortOrder: sortOrderById.get(t.id)! } : t)),
    }));
    await tasksRepo.setTaskSortOrders(entries);
  },
}));
