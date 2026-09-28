import * as Notifications from 'expo-notifications';
import { AppSettings, Category, Expense } from '@/types';
import { monthRange, weekRange } from '@/lib/dateRanges';
import { totalExpenses } from '@/lib/expenses';
import { getTranslation } from '@/i18n';
import { hasNotificationPermission } from './permissions';

async function notifyBudget(identifier: string, title: string, body: string): Promise<void> {
  if (!(await hasNotificationPermission())) return;
  await Notifications.scheduleNotificationAsync({
    identifier,
    content: { title, body },
    trigger: null,
  });
}

async function maybeAlert(
  identifier: string,
  periodLabel: string,
  spent: number,
  limit: number,
  currency: string
): Promise<void> {
  const tr = getTranslation().notificationsContent;
  const ratio = spent / limit;
  const spentStr = `${spent.toFixed(0)}${currency}`;
  const limitStr = `${limit.toFixed(0)}${currency}`;

  if (ratio >= 1) {
    await notifyBudget(identifier, tr.budgetExceededTitle, tr.budgetMessage(spentStr, limitStr, periodLabel));
  } else if (ratio >= 0.9) {
    await notifyBudget(identifier, tr.budgetApproachingTitle, tr.budgetMessage(spentStr, limitStr, periodLabel));
  }
}

/** Call after any expense mutation — cheap to re-check every time since it's just a few sums. */
export async function checkBudgetAlerts(expenses: Expense[], settings: AppSettings, categories: Category[] = []): Promise<void> {
  const now = new Date();
  const tr = getTranslation().notificationsContent;

  if (settings.budgetLimitWeek) {
    const spent = totalExpenses(expenses, weekRange(now));
    await maybeAlert('budget-week', tr.perWeek, spent, settings.budgetLimitWeek, settings.currency);
  }
  if (settings.budgetLimitMonth) {
    const spent = totalExpenses(expenses, monthRange(now));
    await maybeAlert('budget-month', tr.perMonth, spent, settings.budgetLimitMonth, settings.currency);
  }

  const range = monthRange(now);
  for (const category of categories) {
    if (!category.limitMonth) continue;
    const categoryExpenses = expenses.filter((e) => e.categoryId === category.id);
    const spent = totalExpenses(categoryExpenses, range);
    await maybeAlert(`budget-category-${category.id}`, `${tr.perMonth} · ${category.name}`, spent, category.limitMonth, settings.currency);
  }
}
