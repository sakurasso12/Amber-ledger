import { subMonths } from 'date-fns';
import { getDb } from '@/db/client';
import { useTaskStore } from '@/store/useTaskStore';
import { useFinanceStore } from '@/store/useFinanceStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { lockFinances } from '@/store/useFinanceLock';
import { cancelTaskReminder, clearStickyNotification } from '@/notifications';
import { DEFAULT_SETTINGS } from '@/types';
import { buildHabits } from './streaks';
import { clearProfilePassword } from './password';
import { deleteAllPersistedImages, deletePersistedImage } from './imagePicker';
import { refreshHomeWidget } from './widgetRefresh';
import { toDateKey, todayKey } from './dateRanges';

/**
 * Security & storage → Erase data. Each part wipes its tables, the settings that only make sense
 * with that data, and reloads the stores so every screen shows the empty state right away.
 */

export async function eraseTasks(): Promise<void> {
  const tasks = useTaskStore.getState().tasks;
  for (const task of tasks) {
    cancelTaskReminder(task.id);
    clearStickyNotification(task.id);
    if (task.imageUri) await deletePersistedImage(task.imageUri);
  }
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    await db.execAsync('DELETE FROM task_tags; DELETE FROM subtasks; DELETE FROM tasks;');
  });
  useSettingsStore.getState().updateSettings({
    taskCardSizes: {},
    taskManualOrder: [],
    tasksModuleOrder: [],
    streakWidgets: {},
    purgedDoneCount: 0,
  });
  await useTaskStore.getState().load();
  refreshHomeWidget();
}

export async function eraseFinance(): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    await db.execAsync(`
      DELETE FROM plan_spends;
      DELETE FROM spend_plans;
      DELETE FROM expenses;
      DELETE FROM planned_expenses;
      DELETE FROM recurring_expenses;
      DELETE FROM work_days;
      UPDATE categories SET limit_month = NULL;
      DELETE FROM categories WHERE is_default = 0
        AND id NOT IN (SELECT expense_category_id FROM tasks WHERE expense_category_id IS NOT NULL);
    `);
  });
  useSettingsStore.getState().updateSettings({
    bankBalanceBase: 0,
    bankBalanceSetAt: null,
    lastSettledAt: null,
    salaryConfirmations: {},
    salaryPromptSnoozedUntil: null,
    budgetLimitWeek: null,
    budgetLimitMonth: null,
    savingsCard: DEFAULT_SETTINGS.savingsCard,
    savingsBalance: 0,
    savingsRatePercent: 0,
    savingsOpenedAt: null,
    expenseDayOrder: {},
  });
  await useFinanceStore.getState().load();
  refreshHomeWidget();
}

export async function eraseProfile(): Promise<void> {
  const { profileAvatarUri } = useSettingsStore.getState().settings;
  if (profileAvatarUri) await deletePersistedImage(profileAvatarUri);
  await clearProfilePassword();
  // The lock needs the profile password, so it goes with it.
  useSettingsStore.getState().updateSettings({
    profileName: '',
    profileAvatarUri: null,
    profilePasswordSet: false,
    financeLockEnabled: false,
  });
  lockFinances();
}

/** Everything: data, profile, photos and settings. The first-launch setup starts again. */
export async function eraseEverything(): Promise<void> {
  await eraseTasks();
  await eraseFinance();
  await eraseProfile();
  await deleteAllPersistedImages();
  // Settings back to factory; "What's new" for this version is already behind them.
  const { lastSeenVersion } = useSettingsStore.getState().settings;
  useSettingsStore.getState().updateSettings({ ...DEFAULT_SETTINGS, lastSeenVersion });
  refreshHomeWidget();
}

/**
 * Auto clean-up: deletes done tasks and expenses older than `months`. Kept: habits (their streak
 * is their history), current spending plans' records, and the bank balance — removed expenses
 * that counted against it are folded into its base so the figure doesn't jump.
 * Runs at most once a day (call at app start).
 */
export async function runAutoCleanup(): Promise<void> {
  const { autoCleanupMonths, lastAutoCleanup, bankBalanceBase, bankBalanceSetAt, purgedDoneCount } =
    useSettingsStore.getState().settings;
  const today = todayKey();
  if (autoCleanupMonths <= 0 || lastAutoCleanup === today) return;

  const cutoff = subMonths(new Date(), autoCleanupMonths);
  const cutoffKey = toDateKey(cutoff);
  const cutoffIso = cutoff.toISOString();
  const { tasks } = useTaskStore.getState();
  const { expenses, spendPlans } = useFinanceStore.getState();

  const habitSeries = new Set(buildHabits(tasks).map((h) => h.seriesId));
  const oldTasks = tasks.filter(
    (t) => t.status === 'done' && t.completedAt && t.completedAt < cutoffIso && !habitSeries.has(t.seriesId ?? t.id)
  );
  const keepExpenses = new Set(spendPlans.flatMap((p) => [p.reserveExpenseId, p.overspendExpenseId]).filter(Boolean) as string[]);
  const oldExpenses = expenses.filter((e) => e.date < cutoffKey && !keepExpenses.has(e.id));
  // Bank = base − expenses logged after it was set; take the removed ones out of the base instead.
  const countedInBank = oldExpenses.filter((e) => !bankBalanceSetAt || e.createdAt > bankBalanceSetAt).reduce((sum, e) => sum + e.amount, 0);

  const db = await getDb();
  await db.withTransactionAsync(async () => {
    for (const task of oldTasks) {
      await db.runAsync('DELETE FROM tasks WHERE id = ?', [task.id]);
    }
    for (const expense of oldExpenses) {
      await db.runAsync('DELETE FROM expenses WHERE id = ?', [expense.id]);
    }
  });
  for (const task of oldTasks) {
    if (task.imageUri) await deletePersistedImage(task.imageUri);
  }

  useSettingsStore.getState().updateSettings({
    lastAutoCleanup: today,
    purgedDoneCount: purgedDoneCount + oldTasks.length,
    bankBalanceBase: bankBalanceBase - countedInBank,
  });
  if (oldTasks.length > 0) await useTaskStore.getState().load();
  if (oldExpenses.length > 0) await useFinanceStore.getState().load();
}
