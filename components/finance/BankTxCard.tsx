import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { Button, TextField } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';
import { useTranslation } from '@/i18n';
import { useFinanceStore } from '@/store/useFinanceStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { haptics } from '@/lib/haptics';
import { fmtAmount } from '@/lib/money';
import { primaryId } from '@/lib/accounts';
import { toDateKey } from '@/lib/dateRanges';
import { BankTx } from '@/lib/bank/iko';
import { resolveBankTx } from '@/lib/bank/sync';
import { CategoryPicker } from './CategoryPicker';
import { addExpenseAsking } from './balanceQuestion';
import { TymofiiFace, useMascotOn } from '@/components/mascot/Tymofii';

const parse = (text: string) => {
  const n = parseFloat(text.replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
};

/**
 * Personal build: one IKO transaction in "Awaiting answer". Amount, name and category are
 * pre-filled (category = what was picked for this merchant last time); nothing is recorded
 * until "add" is pressed.
 */
export function BankTxCard({ tx }: { tx: BankTx }) {
  const theme = useTheme();
  const tr = useTranslation();
  const categories = useFinanceStore((s) => s.categories);
  const accounts = useFinanceStore((s) => s.accounts);
  const addIncome = useFinanceStore((s) => s.addIncome);
  const remembered = useSettingsStore((s) => s.settings.bankCategoryByMerchant[tx.merchant.toUpperCase()]);
  const fallback = categories.find((c) => c.id === 'cat-other')?.id ?? categories[0]?.id ?? '';

  const [name, setName] = useState(tx.merchant);
  const [amountText, setAmountText] = useState(tx.amount.toFixed(2).replace('.', ','));
  const [categoryId, setCategoryId] = useState(remembered && categories.some((c) => c.id === remembered) ? remembered : fallback);
  const [busy, setBusy] = useState(false);
  const mascot = useMascotOn();

  const money = `${fmtAmount(tx.amount)} ${tx.currency}`;
  const time = new Date(tx.at).toLocaleString(tr.localeCode, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  const title = tx.direction === 'in' ? tr.bank.received(money) : tx.direction === 'out' ? tr.bank.spent(money) : tr.bank.unknown(money);
  const emoji = tx.direction === 'in' ? '💸' : '💳';
  const amount = parse(amountText);
  const pid = primaryId(accounts);

  async function addAsExpense() {
    if (amount === null || busy) return;
    setBusy(true);
    try {
      await addExpenseAsking({ amount, categoryId, date: toDateKey(new Date(tx.at)), comment: name.trim() || null, accountId: pid });
      haptics.success();
      resolveBankTx(tx.id, { merchant: tx.merchant, categoryId });
    } finally {
      setBusy(false);
    }
  }

  async function addAsIncome() {
    if (amount === null || busy) return;
    setBusy(true);
    try {
      await addIncome(amount, pid, toDateKey(new Date(tx.at)));
      haptics.success();
      resolveBankTx(tx.id);
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={[styles.card, { backgroundColor: `${theme.colors.accent}1F`, borderColor: theme.colors.accent }]}>
      <View style={styles.head}>
        <View style={styles.headText}>
          <Text style={[styles.title, { color: theme.colors.text }]}>
            {mascot ? '' : `${emoji} `}
            {title}
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>{tr.bank.via(tx.method, time)}</Text>
        </View>
        {mascot ? <TymofiiFace mood={tx.direction === 'in' ? 'stars' : 'wink'} prop={tx.direction === 'in' ? 'coins' : 'question'} size={52} /> : null}
      </View>
      {tx.gap ? <Text style={[styles.subtitle, { color: theme.colors.warning }]}>{tr.bank.gap(`${fmtAmount(Math.abs(tx.gap))} ${tx.currency}`)}</Text> : null}

      <View style={styles.fields}>
        <TextField label={tr.money.amountLabel(tx.currency)} value={amountText} onChangeText={setAmountText} keyboardType="decimal-pad" />
        {tx.direction !== 'in' ? (
          <>
            <TextField label={tr.bank.nameLabel} value={name} onChangeText={setName} />
            <CategoryPicker categories={categories} value={categoryId} onChange={setCategoryId} />
          </>
        ) : null}
      </View>

      <View style={styles.row}>
        {tx.direction !== 'in' ? <Button title={tr.bank.addExpense} onPress={addAsExpense} disabled={amount === null || busy} style={styles.button} /> : null}
        {tx.direction !== 'out' ? (
          <Button
            title={tr.bank.addIncome}
            variant={tx.direction === 'in' ? 'primary' : 'secondary'}
            onPress={addAsIncome}
            disabled={amount === null || busy}
            style={styles.button}
          />
        ) : null}
      </View>
      <Button title={tr.bank.skip} variant="secondary" onPress={() => resolveBankTx(tx.id)} disabled={busy} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 6 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headText: { flex: 1, gap: 4 },
  title: { fontSize: 15, fontWeight: '700' },
  subtitle: { fontSize: 12, lineHeight: 17 },
  fields: { gap: 10, marginTop: 6 },
  row: { flexDirection: 'row', gap: 8, marginTop: 6 },
  button: { flex: 1 },
});
