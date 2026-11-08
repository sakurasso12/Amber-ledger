import { subMonths } from 'date-fns';
import { getDb } from '@/db/client';
import * as financeRepo from '@/db/financeRepo';
import { useTaskStore } from '@/store/useTaskStore';
import { useFinanceStore } from '@/store/useFinanceStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { lockFinances } from '@/store/useFinanceLock';
import { cancelTaskReminder, clearStickyNotification } from '@/notifications';
import { DEFAULT_SETTINGS } from '@/types';
import { buildHabits } from './streaks';
import { primaryId } from './accounts';
import { absorbInCheck, expenseAccountId, lastCheck } from './ledger';
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
      DELETE FROM adjustments;
      DELETE FROM incomes;
      DELETE FROM upcoming;
      DELETE FROM plan_spends;
      DELETE FROM spend_plans;
      DELETE FROM transfers;
      DELETE FROM accounts;
      DELETE FROM loans;
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
    mainAccountName: '',
    salaryAccountId: DEFAULT_SETTINGS.salaryAccountId,
    salaryAccountAsked: false,
    salaryPromptSnoozedUntil: null,
    budgetLimitWeek: null,
    budgetLimitMonth: null,
    savingsCard: DEFAULT_SETTINGS.savingsCard,
    savingsBalance: 0,
    savingsRatePercent: 0,
    savingsOpenedAt: null,
    expenseDayOrder: {},
    currencyRates: {},
    reconciledWeeks: {},
    pendingSnoozed: {},
    budgetMonthChoice: {},
    // Back to "nothing moved yet": the load below creates a fresh main card at 0.
    financeModel: 1,
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
 * is their history) and every balance — the removed expenses are folded into each account's latest
 * balance check (finance v2) so no figure jumps.
 * Runs at most once a day (call at app start).
 */
export async function runAutoCleanup(): Promise<void> {
  const { autoCleanupMonths, lastAutoCleanup, purgedDoneCount } = useSettingsStore.getState().settings;
  const today = todayKey();
  if (autoCleanupMonths <= 0 || lastAutoCleanup === today) return;

  const cutoff = subMonths(new Date(), autoCleanupMonths);
  const cutoffKey = toDateKey(cutoff);
  const cutoffIso = cutoff.toISOString();
  const { tasks } = useTaskStore.getState();
  const { expenses, accounts, adjustments } = useFinanceStore.getState();

  const habitSeries = new Set(buildHabits(tasks).map((h) => h.seriesId));
  const oldTasks = tasks.filter(
    (t) => t.status === 'done' && t.completedAt && t.completedAt < cutoffIso && !habitSeries.has(t.seriesId ?? t.id)
  );
  const oldExpenses = expenses.filter((e) => e.date < cutoffKey);
  // A balance is the sum of its records: what the removed expenses took off goes into the
  // account's latest check instead, so every balance stays exactly where it was.
  const pid = primaryId(accounts);
  const removedPer = new Map<string, number>();
  for (const e of oldExpenses) {
    const id = expenseAccountId(e, pid);
    removedPer.set(id, (removedPer.get(id) ?? 0) + e.amount);
  }

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

  for (const [accountId, removed] of removedPer) {
    const check = lastCheck(accountId, adjustments);
    if (check) await financeRepo.saveAdjustment(absorbInCheck(check, +removed));
  }

  useSettingsStore.getState().updateSettings({
    lastAutoCleanup: today,
    purgedDoneCount: purgedDoneCount + oldTasks.length,
  });
  if (oldTasks.length > 0) await useTaskStore.getState().load();
  if (oldExpenses.length > 0) await useFinanceStore.getState().load();
}
