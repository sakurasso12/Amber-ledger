import { Alert } from 'react-native';
import { getTranslation } from '@/i18n';
import { checkAfterRecord, checkCovering, expenseAccountId } from '@/lib/ledger';
import { primaryId } from '@/lib/accounts';
import { useFinanceStore } from '@/store/useFinanceStore';
import { ExpenseDraft, Expense } from '@/types';

/**
 * The finance v2 question for records dated on or before an account's last balance check: was it
 * already in the balance typed in then? Resolves true = yes (keep the balance), false = no (move it),
 * without asking when there's no such check.
 */
function ask(accountId: string, at: { date?: string; createdAt?: string }, mode: 'add' | 'delete'): Promise<boolean> {
  const { adjustments } = useFinanceStore.getState();
  const check = at.createdAt ? checkAfterRecord(accountId, at.createdAt, adjustments) : checkCovering(accountId, at.date ?? '', adjustments);
  if (!check) return Promise.resolve(false);
  const tr = getTranslation();
  const day = new Date(`${check.date}T12:00:00`).toLocaleDateString(tr.localeCode, { day: 'numeric', month: 'long' });
  return new Promise((resolve) => {
    if (mode === 'add') {
      Alert.alert(tr.money.includedTitle, tr.money.includedAdd(day), [
        { text: tr.money.includedNo, onPress: () => resolve(false) },
        { text: tr.money.includedYes, onPress: () => resolve(true) },
      ], { cancelable: false });
    } else {
      Alert.alert(tr.money.deleteTitle, tr.money.deleteText(day), [
        { text: tr.money.giveBack, onPress: () => resolve(false) },
        { text: tr.money.keepBalance, onPress: () => resolve(true) },
      ], { cancelable: false });
    }
  });
}

const pid = () => primaryId(useFinanceStore.getState().accounts);

export async function addExpenseAsking(draft: ExpenseDraft): Promise<void> {
  const alreadyCounted = await ask(draft.accountId ?? pid(), { date: draft.date }, 'add');
  await useFinanceStore.getState().addExpense(draft, { alreadyCounted });
}

export async function editExpenseAsking(expense: Expense): Promise<void> {
  const before = useFinanceStore.getState().expenses.find((e) => e.id === expense.id);
  // Only a change to money, date or account can touch a balance.
  const moved =
    !!before &&
    (before.amount !== expense.amount || before.date !== expense.date || expenseAccountId(before, pid()) !== expenseAccountId(expense, pid()));
  const alreadyCounted = moved && before ? await ask(expenseAccountId(before, pid()), { createdAt: before.createdAt }, 'delete') : false;
  await useFinanceStore.getState().editExpense(expense, { alreadyCounted });
}

export async function removeExpenseAsking(id: string): Promise<void> {
  const expense = useFinanceStore.getState().expenses.find((e) => e.id === id);
  if (!expense) return;
  const alreadyCounted = await ask(expenseAccountId(expense, pid()), { createdAt: expense.createdAt }, 'delete');
  await useFinanceStore.getState().removeExpense(id, { alreadyCounted });
}
