import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';
import { useFinanceStore } from '@/store/useFinanceStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { accountName, isSpendable, primaryId } from '@/lib/accounts';
import { balanceOf } from '@/lib/ledger';
import { isPaidOff, paymentDue, remainingDebt } from '@/lib/loans';
import { fmtAmount } from '@/lib/money';

const parseAmount = (text: string) => parseFloat(text.replace(',', '.').replace(/\s/g, ''));
import { todayKey } from '@/lib/dateRanges';
import { haptics } from '@/lib/haptics';
import { useTranslation } from '@/i18n';
import { Account, AccountKind } from '@/types';
import { MoneyDialog } from './MoneyDialog';
import { NO_ACCOUNT_ID } from './AccountPicker';

/** A loan as a transfer target: `loan:<id>` — paying it logs an expense (see payLoan). */
export const LOAN_PREFIX = 'loan:';
export const loanTarget = (loanId: string) => `${LOAN_PREFIX}${loanId}`;

const KIND_ICON: Record<AccountKind, keyof typeof Ionicons.glyphMap> = {
  card: 'card-outline',
  cash: 'cash-outline',
  stash: 'wallet-outline',
  goal: 'flag-outline',
  savings: 'trending-up-outline',
};

interface Tile {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  name: string;
  /** Balance, or for a loan what's still owed. */
  amount: number;
  currency: string;
  loan: boolean;
}

/**
 * Moving money: from a card or wallet to any account — or to a loan, which pays it with any amount.
 * Accounts are tiles with their balance, ⇅ swaps the sides, quick buttons fill the amount, and the
 * bottom line shows what both sides will look like afterwards.
 * With `fixedTo` (a goal's "put aside") only the source is picked, plus "just count it".
 */
export function TransferDialog({
  visible,
  onClose,
  initialFrom,
  initialTo,
  fixedTo,
}: {
  visible: boolean;
  onClose: () => void;
  initialFrom: string;
  /** An account id, or loanTarget(id). */
  initialTo: string;
  fixedTo?: Account;
}) {
  const theme = useTheme();
  const tr = useTranslation();
  const t = tr.transferUi;
  const appCurrency = useSettingsStore((s) => s.settings.currency);
  const accounts = useFinanceStore((s) => s.accounts);
  const loans = useFinanceStore((s) => s.loans);
  const expenses = useFinanceStore((s) => s.expenses);
  const incomes = useFinanceStore((s) => s.incomes);
  const adjustments = useFinanceStore((s) => s.adjustments);
  const transfers = useFinanceStore((s) => s.transfers);
  const addTransfer = useFinanceStore((s) => s.addTransfer);
  const payLoan = useFinanceStore((s) => s.payLoan);

  const [fromId, setFromId] = useState(initialFrom);
  const [toId, setToId] = useState(initialTo);
  const [amount, setAmount] = useState('');
  const [received, setReceived] = useState('');

  const [wasVisible, setWasVisible] = useState(visible);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) {
      setFromId(initialFrom);
      setToId(fixedTo ? fixedTo.id : initialTo);
      const loan = initialTo.startsWith(LOAN_PREFIX) ? loans.find((l) => loanTarget(l.id) === initialTo) : undefined;
      setAmount(loan ? String(Math.round(paymentDue(loan) * 100) / 100) : '');
      setReceived('');
    }
  }

  const { sources, targets } = useMemo(() => {
    const pid = primaryId(accounts);
    const today = todayKey();
    const data = { expenses, incomes, adjustments, transfers };
    const sorted = [...accounts].sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary));
    const tile = (a: Account): Tile => ({
      id: a.id,
      icon: KIND_ICON[a.kind],
      name: accountName(a, tr.accounts),
      amount: balanceOf(a.id, data, pid, today),
      currency: a.currency,
      loan: false,
    });
    const src = sorted.filter(isSpendable).map(tile);
    if (fixedTo) src.push({ id: NO_ACCOUNT_ID, icon: 'calculator-outline', name: tr.accounts.noSource, amount: NaN, currency: fixedTo.currency, loan: false });
    const dst = sorted.map(tile);
    for (const l of loans) {
      if (isPaidOff(l)) continue;
      dst.push({ id: loanTarget(l.id), icon: 'document-text-outline', name: l.name, amount: remainingDebt(l), currency: l.currency, loan: true });
    }
    return { sources: src, targets: dst };
  }, [accounts, loans, expenses, incomes, adjustments, transfers, fixedTo, tr]);

  const from = sources.find((s) => s.id === fromId);
  const to = fixedTo ? targets.find((s) => s.id === fixedTo.id) : targets.find((s) => s.id === toId);
  const loan = to?.loan ? loans.find((l) => loanTarget(l.id) === to.id) : undefined;
  const counterOnly = fromId === NO_ACCOUNT_ID;
  const sameCurrency = counterOnly || !from || !to || from.currency === to.currency;
  const sent = parseAmount(amount);
  const got = sameCurrency ? sent : parseAmount(received);
  const canSwap = !fixedTo && !!to && !to.loan && isSpendable(accounts.find((a) => a.id === to.id) ?? ({ kind: 'goal' } as Account));
  const valid = sent > 0 && got > 0 && !!to && fromId !== to.id;

  const money = (n: number, currency: string) => `${fmtAmount(n)} ${currency}`;
  const setNum = (n: number) => setAmount(String(Math.round(n * 100) / 100));

  const quick: { label: string; value: number }[] = [];
  if (loan) {
    quick.push({ label: t.payment(fmtAmount(paymentDue(loan))), value: paymentDue(loan) });
    quick.push({ label: t.wholeDebt, value: remainingDebt(loan) });
  }
  if (from && !counterOnly && from.amount > 0) {
    quick.push({ label: t.half, value: from.amount / 2 });
    quick.push({ label: t.all, value: from.amount });
  }

  function swap() {
    if (!canSwap || !to) return;
    haptics.tap();
    setFromId(to.id);
    setToId(fromId);
  }

  async function save() {
    if (!valid || !to) return;
    if (loan) await payLoan(loan.id, fromId, sent);
    else await addTransfer({ fromId, toId: to.id, amount: sent, amountTo: got, date: todayKey() });
    haptics.success();
    onClose();
  }

  const title = fixedTo ? tr.accounts.putAside : loan ? t.payLoanTitle : tr.accounts.transfer;

  return (
    <MoneyDialog visible={visible} onClose={onClose} title={title}>
      <Text style={[styles.label, { color: theme.colors.textMuted }]}>{t.from}</Text>
      <TileRow tiles={sources} value={fromId} onChange={setFromId} exclude={to ? [to.id] : []} />

      {fixedTo ? null : (
        <>
          <View style={styles.middle}>
            <View style={[styles.line, { backgroundColor: theme.colors.border }]} />
            <Pressable
              onPress={swap}
              disabled={!canSwap}
              hitSlop={8}
              style={[styles.swap, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface, opacity: canSwap ? 1 : 0.35 }]}
              accessibilityLabel={t.swap}
            >
              <Ionicons name="swap-vertical" size={18} color={theme.colors.primary} />
            </Pressable>
            <View style={[styles.line, { backgroundColor: theme.colors.border }]} />
          </View>
          <Text style={[styles.label, { color: theme.colors.textMuted }]}>{t.to}</Text>
          <TileRow tiles={targets} value={toId} onChange={(id) => {
            setToId(id);
            const l = loans.find((x) => loanTarget(x.id) === id);
            if (l) setNum(paymentDue(l));
          }} exclude={[fromId]} />
        </>
      )}

      <View style={[styles.amountBox, { borderColor: valid ? theme.colors.primary : theme.colors.border }]}>
        <TextInput
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          placeholder="0"
          placeholderTextColor={theme.colors.textMuted}
          style={[styles.amountInput, { color: theme.colors.text }]}
          selectTextOnFocus
        />
        <Text style={[styles.amountCurrency, { color: theme.colors.textMuted }]}>{from && !counterOnly ? from.currency : (to?.currency ?? appCurrency)}</Text>
      </View>

      {quick.length > 0 ? (
        <View style={styles.quickRow}>
          {quick.map((q) => (
            <Pressable
              key={q.label}
              onPress={() => {
                haptics.tap();
                setNum(q.value);
              }}
              style={[styles.quick, { borderColor: theme.colors.border }]}
            >
              <Text style={[styles.quickText, { color: theme.colors.text }]} numberOfLines={1}>{q.label}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {sameCurrency ? null : (
        <View style={[styles.amountBox, styles.receivedBox, { borderColor: theme.colors.border }]}>
          <Text style={[styles.receivedLabel, { color: theme.colors.textMuted }]}>{t.arrives}</Text>
          <TextInput
            value={received}
            onChangeText={setReceived}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor={theme.colors.textMuted}
            style={[styles.receivedInput, { color: theme.colors.text }]}
          />
          <Text style={[styles.amountCurrency, { color: theme.colors.textMuted }]}>{to?.currency}</Text>
        </View>
      )}

      {valid && to ? (
        <View style={[styles.preview, { backgroundColor: `${theme.colors.primary}14` }]}>
          {from && !counterOnly ? (
            <PreviewLine name={from.name} before={from.amount} after={from.amount - sent} currency={from.currency} />
          ) : null}
          <PreviewLine
            name={loan ? t.debtOf(to.name) : to.name}
            before={to.amount}
            after={loan ? Math.max(0, to.amount - sent) : to.amount + got}
            currency={to.currency}
          />
          {loan && sent > remainingDebt(loan) + 0.005 ? (
            <Text style={[styles.warn, { color: theme.colors.danger }]}>{t.moreThanDebt}</Text>
          ) : null}
        </View>
      ) : null}

      <View style={styles.buttons}>
        <Button title={tr.accounts.cancel} variant="secondary" onPress={onClose} style={styles.flex} />
        <Button title={loan ? t.pay : fixedTo ? tr.accounts.putAside : tr.accounts.transfer} onPress={save} disabled={!valid} style={styles.flex} />
      </View>
    </MoneyDialog>
  );

  function PreviewLine({ name, before, after, currency }: { name: string; before: number; after: number; currency: string }) {
    return (
      <View style={styles.previewRow}>
        <Text style={[styles.previewName, { color: theme.colors.textMuted }]} numberOfLines={1}>{name}</Text>
        <Text style={[styles.previewNums, { color: theme.colors.text }]}>
          {money(before, currency)} → <Text style={{ fontWeight: '800', color: after < 0 ? theme.colors.danger : theme.colors.text }}>{money(after, currency)}</Text>
        </Text>
      </View>
    );
  }
}

/** Horizontal row of account / loan tiles: icon, name, balance. */
function TileRow({ tiles, value, onChange, exclude }: { tiles: Tile[]; value: string; onChange: (id: string) => void; exclude: string[] }) {
  const theme = useTheme();
  const shown = tiles.filter((t) => !exclude.includes(t.id));
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tiles}>
      {shown.map((tile) => {
        const selected = tile.id === value;
        return (
          <Pressable
            key={tile.id}
            onPress={() => {
              haptics.tap();
              onChange(tile.id);
            }}
            style={[
              styles.tile,
              {
                borderColor: selected ? theme.colors.primary : theme.colors.border,
                backgroundColor: selected ? `${theme.colors.primary}22` : 'transparent',
              },
            ]}
          >
            <Ionicons name={tile.icon} size={16} color={selected ? theme.colors.primary : theme.colors.textMuted} />
            <Text style={[styles.tileName, { color: theme.colors.text }]} numberOfLines={1}>{tile.name}</Text>
            {Number.isFinite(tile.amount) ? (
              <Text style={[styles.tileAmount, { color: tile.loan ? theme.colors.danger : theme.colors.textMuted }]} numberOfLines={1}>
                {tile.loan ? '−' : ''}{fmtAmount(tile.amount)} {tile.currency}
              </Text>
            ) : null}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 },
  tiles: { flexDirection: 'row', gap: 8, paddingBottom: 2 },
  tile: { width: 112, padding: 10, borderRadius: 14, borderWidth: 1.5, gap: 4 },
  tileName: { fontSize: 13, fontWeight: '700' },
  tileAmount: { fontSize: 12, fontWeight: '600' },
  middle: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  line: { flex: 1, height: StyleSheet.hairlineWidth },
  swap: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  amountBox: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 14, gap: 8 },
  amountInput: { flex: 1, fontSize: 30, fontWeight: '800', paddingVertical: 10 },
  amountCurrency: { fontSize: 16, fontWeight: '700' },
  receivedBox: { paddingVertical: 4 },
  receivedLabel: { fontSize: 12, fontWeight: '600' },
  receivedInput: { flex: 1, fontSize: 18, fontWeight: '700', paddingVertical: 8, textAlign: 'right' },
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  quick: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1 },
  quickText: { fontSize: 12, fontWeight: '700' },
  preview: { borderRadius: 12, padding: 10, gap: 4 },
  previewRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  previewName: { fontSize: 12, fontWeight: '600', flexShrink: 1 },
  previewNums: { fontSize: 12 },
  warn: { fontSize: 12, fontWeight: '600' },
  buttons: { flexDirection: 'row', gap: 8 },
  flex: { flex: 1 },
});
