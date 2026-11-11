import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/theme/ThemeProvider';
import { CustomizableCard, Button, TextField } from '@/components/ui';
import { useTranslation } from '@/i18n';
import { CommittedItem, sumItems } from '@/lib/ledger';
import { glowText } from '@/theme/theme';
import { categoryLabel } from '@/lib/categoryLabel';
import { Category } from '@/types';
import { MoneyDialog } from './MoneyDialog';
import { fmtAmount, amountDraft } from '@/lib/money';

interface BalanceCardProps {
  /** Bank name of the main card ("" = not named). */
  name: string;
  /** What's on the main card now — the sum of its records (lib/ledger balanceOf). */
  balance: number;
  /** Spent from it since the 1st. */
  spentMonth: number;
  /** Money already spoken for until the next payday (lib/ledger committedUntil). */
  committed: CommittedItem[];
  /** The next payday, formatted ("10 Nov"). */
  paydayLabel: string;
  /** The real balance typed in (null = only renamed) and the name. */
  onEdit: (real: number | null, name: string) => void;
  /** Closed pay periods waiting for their salary to be confirmed. */
  awaiting: number;
  awaitingLabel: string | null;
  /** Earnings of the current (still open) period — greyed out. */
  accruing: number;
  accruingLabel: string;
  currency: string;
  categories: Category[];
}

/**
 * The main card on Finance (finance v2): the big figure is what's on the card NOW; under it, in
 * grey, what's left after everything already spoken for until payday, and a bar of free vs spoken
 * for. Tapping the grey line lists what it's made of. Next to it: salary still to come.
 */
export function BalanceCard({
  name,
  balance,
  spentMonth,
  committed,
  paydayLabel,
  onEdit,
  awaiting,
  awaitingLabel,
  accruing,
  accruingLabel,
  currency,
  categories,
}: BalanceCardProps) {
  const theme = useTheme();
  const tr = useTranslation();
  const committedTotal = sumItems(committed);
  const afterAll = balance - committedTotal;
  const total = afterAll + awaiting;

  const [editing, setEditing] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [nameDraft, setNameDraft] = useState('');
  const label = name.trim() || tr.financeScreen.bank;

  function openEditor() {
    setDraft(amountDraft(balance));
    setNameDraft(name);
    setEditing(true);
  }

  function save() {
    const n = parseFloat(draft.replace(',', '.'));
    const same = Number.isFinite(n) && Math.abs(n - balance) < 0.005;
    // Just renaming adds no correction.
    onEdit(same || !Number.isFinite(n) ? null : n, nameDraft.trim());
    setEditing(false);
  }

  const muted = theme.colors.textMuted;
  const money = (n: number) => `${fmtAmount(n)} ${currency}`;
  const signed = (n: number) => `${n >= 0 ? '' : '−'}${fmtAmount(Math.abs(n))} ${currency}`;
  const balanceColor = balance >= 0 ? theme.colors.success : theme.colors.danger;

  // Free vs spoken for: the bar is the card's money; the spoken-for part sits on the right.
  const freeRatio = balance > 0 ? Math.max(0, Math.min(1, afterAll / balance)) : 0;
  const bar = (
    <View style={[styles.bar, { backgroundColor: theme.dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)' }]}>
      <View style={{ flex: freeRatio, backgroundColor: afterAll >= 0 ? theme.colors.success : theme.colors.danger, borderRadius: 3 }} />
      <View style={{ flex: 1 - freeRatio }} />
    </View>
  );

  const main = (big: boolean) => (
    <Pressable onPress={openEditor} style={styles.mainCol}>
      <Text style={[styles.header, { color: muted }]}>
        {label} <Text style={{ color: theme.colors.accent }}>✏️</Text>
      </Text>
      <Text numberOfLines={1} adjustsFontSizeToFit style={[big ? styles.heroAmount : styles.amount, { color: balanceColor }, glowText(theme, balanceColor)]}>
        {signed(balance)}
      </Text>
      <Pressable onPress={() => setListOpen(true)} hitSlop={6}>
        <Text style={[styles.after, { color: muted }]} numberOfLines={1}>
          ▸ {tr.money.untilPayday(paydayLabel)}: <Text style={{ color: muted, fontWeight: '800' }}>{signed(afterAll)}</Text>
        </Text>
      </Pressable>
      {bar}
      {spentMonth > 0 ? (
        <Text style={[styles.subline, { color: muted }]}>
          {tr.money.spentMonth}: {fmtAmount(spentMonth)}
        </Text>
      ) : null}
    </Pressable>
  );

  const incoming = (
    <View style={styles.column}>
      <Text style={[styles.header, { color: muted }]}>{tr.financeScreen.incoming}</Text>
      {awaitingLabel ? (
        <>
          <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.amount, { color: theme.colors.accent }, glowText(theme, theme.colors.accent)]}>{money(awaiting)}</Text>
          <Text style={[styles.subline, { color: muted }]}>{awaitingLabel}</Text>
        </>
      ) : null}
      <Text numberOfLines={1} adjustsFontSizeToFit style={[awaitingLabel ? styles.accruingAmount : styles.amount, { color: muted }]}>
        {awaitingLabel ? '+ ' : ''}
        {money(accruing)}
      </Text>
      <Text style={[styles.subline, { color: muted }]}>{`${accruingLabel} · ${tr.financeScreen.accruing}`}</Text>
    </View>
  );

  let body: React.ReactNode;
  if (theme.layout.balance === 'hero') {
    // Neon: the card's money is the hero; salary to come sits underneath as a pill.
    body = (
      <View style={styles.heroWrap}>
        {main(true)}
        <View style={[styles.heroPill, { backgroundColor: theme.colors.surfaceAlt }]}>{incoming}</View>
      </View>
    );
  } else {
    body = (
      <>
        <View style={styles.columns}>
          {main(false)}
          <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
          {incoming}
        </View>
        <View style={[styles.totalRow, { borderTopColor: theme.colors.border }]}>
          <Text style={[styles.totalLabel, { color: muted }]}>{tr.financeScreen.total}</Text>
          <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.totalAmount, { color: total >= 0 ? theme.colors.success : theme.colors.danger }]}>
            {signed(total)}
          </Text>
        </View>
      </>
    );
  }

  const kindLabel: Record<CommittedItem['kind'], string> = {
    expense: tr.money.kindExpense,
    upcoming: tr.money.kindUpcoming,
    loan: tr.money.kindLoan,
    budget: tr.money.kindBudget,
  };
  const categoryById = new Map(categories.map((c) => [c.id, c]));

  return (
    <CustomizableCard widgetId="finance-balance">
      {body}

      <MoneyDialog visible={editing} onClose={() => setEditing(false)} title={tr.financeScreen.editBankTitle(currency)} hint={tr.money.correctionHint}>
        <TextField label={tr.accounts.bankName} value={nameDraft} onChangeText={setNameDraft} placeholder={tr.accounts.bankNamePlaceholder} />
        <TextField value={draft} onChangeText={setDraft} keyboardType="decimal-pad" autoFocus />
        <View style={styles.dialogActions}>
          <Button title={tr.money.cancel} variant="secondary" onPress={() => setEditing(false)} style={styles.dialogButton} />
          <Button title={tr.money.save} onPress={save} style={styles.dialogButton} />
        </View>
      </MoneyDialog>

      <MoneyDialog visible={listOpen} onClose={() => setListOpen(false)} title={tr.money.committedTitle(paydayLabel)}>
        {committed.length === 0 ? <Text style={{ color: muted, fontSize: 13 }}>{tr.money.committedEmpty}</Text> : null}
        {committed.map((item) => (
          <View key={item.key} style={[styles.row, { borderColor: theme.colors.border }]}>
            <View style={styles.rowText}>
              <Text style={{ color: theme.colors.text, fontSize: 14, fontWeight: '600' }} numberOfLines={1}>
                {item.label || categoryLabel(categoryById.get(item.categoryId ?? ''), tr) || kindLabel[item.kind]}
              </Text>
              <Text style={{ color: muted, fontSize: 12 }}>
                {kindLabel[item.kind]}
                {item.date ? ` · ${new Date(`${item.date}T12:00:00`).toLocaleDateString(tr.localeCode, { day: 'numeric', month: 'short' })}` : ''}
              </Text>
            </View>
            <Text style={{ color: theme.colors.text, fontSize: 14, fontWeight: '700' }}>−{money(item.amount)}</Text>
          </View>
        ))}
        {committed.length > 0 ? (
          <View style={styles.row}>
            <Text style={{ color: muted, fontSize: 13, fontWeight: '700', flex: 1 }}>{tr.financeScreen.total}</Text>
            <Text style={{ color: theme.colors.text, fontSize: 14, fontWeight: '800' }}>−{money(committedTotal)}</Text>
          </View>
        ) : null}
      </MoneyDialog>
    </CustomizableCard>
  );
}

const styles = StyleSheet.create({
  columns: { flexDirection: 'row', alignItems: 'stretch' },
  mainCol: { flex: 1.3, gap: 4 },
  column: { flex: 1, gap: 4 },
  divider: { width: 1, marginHorizontal: 14 },
  header: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 },
  amount: { fontSize: 24, fontWeight: '800' },
  after: { fontSize: 12, fontWeight: '600' },
  bar: { height: 6, borderRadius: 3, flexDirection: 'row', overflow: 'hidden', marginTop: 2 },
  subline: { fontSize: 11 },
  accruingAmount: { fontSize: 15, fontWeight: '700', marginTop: 6 },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  totalLabel: { fontSize: 12, fontWeight: '600', flexShrink: 1, marginRight: 10 },
  totalAmount: { fontSize: 19, fontWeight: '800', flexShrink: 1, textAlign: 'right' },
  dialogActions: { flexDirection: 'row', gap: 10 },
  dialogButton: { flex: 1 },
  heroWrap: { gap: 14 },
  heroAmount: { fontSize: 40, fontWeight: '800' },
  heroPill: { borderRadius: 18, padding: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: 'transparent' },
  rowText: { flex: 1, gap: 2 },
});
