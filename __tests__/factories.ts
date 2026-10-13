import { Expense, PlanSpend, SpendPlan, Task } from '@/types';

/** Small builders so each test only spells out the fields it's about. */

export function task(fields: Partial<Task> = {}): Task {
  return {
    id: 't1',
    title: 'Task',
    description: '',
    deadlineAt: null,
    priority: 'medium',
    status: 'not_started',
    tags: [],
    isImportant: false,
    recurrenceRule: null,
    seriesId: null,
    imageUri: null,
    sortOrder: 0,
    expenseOnComplete: null,
    createdAt: '2026-10-01T08:00:00.000Z',
    updatedAt: '2026-10-01T08:00:00.000Z',
    completedAt: null,
    subtasks: [],
    ...fields,
  };
}

export function expense(fields: Partial<Expense> = {}): Expense {
  return {
    id: 'e1',
    amount: 100,
    categoryId: 'cat-food',
    date: '2026-10-10',
    comment: null,
    createdAt: '2026-10-10T10:00:00.000Z',
    planId: null,
    planRole: null,
    taskId: null,
    ...fields,
  };
}

export function plan(fields: Partial<SpendPlan> = {}): SpendPlan {
  return {
    id: 'p1',
    name: 'Food',
    categoryId: 'cat-food',
    limit: 800,
    period: 0,
    periodStart: '2026-10-01',
    reserveExpenseId: 'reserve',
    overspendExpenseId: null,
    createdAt: '2026-10-01T08:00:00.000Z',
    ...fields,
  };
}

export function spend(fields: Partial<PlanSpend> = {}): PlanSpend {
  return { id: 's1', planId: 'p1', period: 0, amount: 100, date: '2026-10-05', createdAt: '2026-10-05T12:00:00.000Z', ...fields };
}
