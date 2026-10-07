import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/theme/ThemeProvider';
import { CustomizableCard, Button, TextField } from '@/components/ui';
import { useTranslation } from '@/i18n';

interface BalanceCardProps {
  /** Cash on hand: manual base − expenses + salaries credited since (see FinanceScreen). */
  bank: number;
  spentSinceSet: number;
  /** Salary added to Bank automatically on paydays since it was last set by hand. */
  creditedSinceSet: number;
  onEditBank: (newBase: number) => void;
  /** Closed pay periods waiting for their salary to be confirmed. */
  awaiting: number;
  /** Date range of the awaiting periods, or null when nothing is waiting. */
  awaitingLabel: string | null;
  /** Earnings of the current (still open) period — shown greyed out, not editable. */
  accruing: number;
  accruingLabel: string;
  /** Known future expenses not yet paid — subtracted from the projected total. */
  plannedTotal: number;
  currency: string;
}

export function BalanceCard({
  bank,
  spentSinceSet,
  creditedSinceSet,
  onEditBank,
  awaiting,
  awaitingLabel,
  accruing,
  accruingLabel,
  plannedTotal,
  currency,
}: BalanceCardProps) {
  const theme = useTheme();
  const tr = useTranslation();
  const bankColor = bank >= 0 ? theme.colors.success : theme.colors.danger;
  const total = bank + awaiting + accruing - plannedTotal;

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  function openEditor() {
    setDraft(bank.toFixed(0));
    setEditing(true);
  }

  function save() {
    const n = parseFloat(draft.replace(',', '.'));
    if (Number.isFinite(n)) onEditBank(n);
    setEditing(false);
  }

  const muted = theme.colors.textMuted;
  const totalColor = total >= 0 ? theme.colors.success : theme.colors.danger;
  const signed = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(0)} ${currency}`;
  const money = (n: number) => `${n.toFixed(0)} ${currency}`;

  const bankDetails = (
    <>
      <Text style={[styles.subline, { color: muted }]}>
        {tr.financeScreen.spent.toLowerCase()}: {spentSinceSet.toFixed(0)}
      </Text>
      {creditedSinceSet > 0 ? (
        <Text style={[styles.subline, { color: muted }]}>
          {tr.financeScreen.salaryCredited}: +{creditedSinceSet.toFixed(0)}
        </Text>
      ) : null}
    </>
  );
  const accruingLine = `${accruingLabel} · ${tr.financeScreen.accruing}`;
  const plannedNote =
    plannedTotal > 0 ? (
      <Text style={[styles.plannedNote, { color: muted }]}>
        {tr.financeScreen.plannedIncluded}: -{plannedTotal.toFixed(0)}
      </Text>
    ) : null;

  let body: React.ReactNode;
  switch (theme.design.balanceLayout) {
    // Neon: the projected total is the hero, bank and incoming sit underneath as two pills.
    case 'hero':
      body = (
        <View style={styles.heroWrap}>
          <Text style={[styles.header, { color: muted, textAlign: 'center' }]}>{tr.financeScreen.total}</Text>
          <Text style={[styles.heroAmount, { color: totalColor }]}>{signed(total)}</Text>
          {plannedNote}
          <View style={styles.heroPills}>
            <Pressable onPress={openEditor} style={[styles.heroPill, { backgroundColor: theme.colors.surfaceAlt }]}>
              <Text style={[styles.header, { color: muted }]}>{tr.financeScreen.bank} ✏️</Text>
              <Text style={[styles.pillAmount, { color: bankColor }]}>{signed(bank)}</Text>
              {bankDetails}
            </Pressable>
            <View style={[styles.heroPill, { backgroundColor: theme.colors.surfaceAlt }]}>
              <Text style={[styles.header, { color: muted }]}>{tr.financeScreen.incoming}</Text>
              {awaitingLabel ? (
                <>
                  <Text style={[styles.pillAmount, { color: theme.colors.accent }]}>{money(awaiting)}</Text>
                  <Text style={[styles.subline, { color: muted }]}>{awaitingLabel}</Text>
                </>
              ) : null}
              <Text style={[awaitingLabel ? styles.accruingAmount : styles.pillAmount, { color: muted }]}>
                {awaitingLabel ? '+ ' : ''}
                {money(accruing)}
              </Text>
              <Text style={[styles.subline, { color: muted }]}>{accruingLine}</Text>
            </View>
          </View>
        </View>
      );
      break;

    // Paper: ledger rows with dotted leaders, total underlined twice like in an account book.
    case 'ledger': {
      const row = (label: string, value: string, color: string, sub?: string, onPress?: () => void) => (
        <Pressable onPress={onPress} disabled={!onPress} style={styles.ledgerRow}>
          <View style={styles.ledgerLine}>
            <Text style={[styles.ledgerLabel, { color: theme.colors.text }]}>{label}</Text>
            <View style={[styles.ledgerDots, { borderColor: muted }]} />
            <Text style={[styles.ledgerValue, { color }]}>{value}</Text>
          </View>
          {sub ? <Text style={[styles.subline, { color: muted }]}>{sub}</Text> : null}
        </Pressable>
      );
      body = (
        <View>
          {row(`${tr.financeScreen.bank} ✎`, signed(bank), bankColor, `${tr.financeScreen.spent.toLowerCase()}: ${spentSinceSet.toFixed(0)}${creditedSinceSet > 0 ? ` · ${tr.financeScreen.salaryCredited}: +${creditedSinceSet.toFixed(0)}` : ''}`, openEditor)}
          {awaitingLabel ? row(tr.financeScreen.incoming, money(awaiting), theme.colors.accent, awaitingLabel) : null}
          {row(awaitingLabel ? tr.financeScreen.accruing : tr.financeScreen.incoming, money(accruing), muted, accruingLine)}
          <View style={[styles.ledgerTotal, { borderTopColor: theme.colors.border, borderBottomColor: theme.colors.border }]}>
            <Text style={[styles.ledgerLabel, { color: theme.colors.text, fontWeight: '700' }]}>{tr.financeScreen.total}</Text>
            <Text style={[styles.ledgerTotalValue, { color: totalColor }]}>{signed(total)}</Text>
          </View>
          {plannedNote}
        </View>
      );
      break;
    }

    // Bold: stacked solid blocks — bank in the inverted colour, incoming and total below.
    case 'blocks':
      body = (
        <View style={styles.blocksWrap}>
          <Pressable onPress={openEditor} style={[styles.block, { backgroundColor: theme.colors.primary }]}>
            <Text style={[styles.header, { color: theme.colors.primaryText }]}>{tr.financeScreen.bank} ✏️</Text>
            <Text style={[styles.blockAmount, { color: theme.colors.primaryText }]}>{signed(bank)}</Text>
            <Text style={[styles.subline, { color: theme.colors.primaryText }]}>
              {tr.financeScreen.spent.toLowerCase()}: {spentSinceSet.toFixed(0)}
              {creditedSinceSet > 0 ? ` · ${tr.financeScreen.salaryCredited}: +${creditedSinceSet.toFixed(0)}` : ''}
            </Text>
          </Pressable>
          <View style={styles.blocksRow}>
            <View style={[styles.block, styles.blockHalf, { backgroundColor: theme.colors.surfaceAlt, borderColor: theme.colors.border }]}>
              <Text style={[styles.header, { color: theme.colors.text }]}>{tr.financeScreen.incoming}</Text>
              <Text style={[styles.pillAmount, { color: theme.colors.text }]}>{money(awaitingLabel ? awaiting : accruing)}</Text>
              <Text style={[styles.subline, { color: muted }]}>{awaitingLabel ?? accruingLine}</Text>
              {awaitingLabel ? (
                <Text style={[styles.subline, { color: muted }]}>
                  + {money(accruing)} · {tr.financeScreen.accruing}
                </Text>
              ) : null}
            </View>
            <View style={[styles.block, styles.blockHalf, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <Text style={[styles.header, { color: theme.colors.text }]}>{tr.financeScreen.total}</Text>
              <Text style={[styles.pillAmount, { color: totalColor }]}>{signed(total)}</Text>
              {plannedNote}
            </View>
          </View>
        </View>
      );
      break;

    // Amber (classic): bank | incoming columns, total underneath.
    case 'columns':
    default:
      body = (
        <>
          <View style={styles.columns}>
            <Pressable style={styles.column} onPress={openEditor}>
              <Text style={[styles.header, { color: muted }]}>
                {tr.financeScreen.bank} <Text style={{ color: theme.colors.accent }}>✏️</Text>
              </Text>
              <Text style={[styles.amount, { color: bankColor }]}>{signed(bank)}</Text>
              {bankDetails}
            </Pressable>

            <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

            <View style={styles.column}>
              <Text style={[styles.header, { color: muted }]}>{tr.financeScreen.incoming}</Text>
              {awaitingLabel ? (
                <>
                  <Text style={[styles.amount, { color: theme.colors.accent }]}>{money(awaiting)}</Text>
                  <Text style={[styles.subline, { color: muted }]}>{awaitingLabel}</Text>
                </>
              ) : null}
              <Text style={[awaitingLabel ? styles.accruingAmount : styles.amount, { color: muted }]}>
                {awaitingLabel ? '+ ' : ''}
                {money(accruing)}
              </Text>
              <Text style={[styles.subline, { color: muted }]}>{accruingLine}</Text>
            </View>
          </View>

          <View style={[styles.totalRow, { borderTopColor: theme.colors.border }]}>
            <Text style={[styles.totalLabel, { color: muted }]}>{tr.financeScreen.total}</Text>
            <Text style={[styles.totalAmount, { color: totalColor }]}>{signed(total)}</Text>
          </View>
          {plannedNote}
        </>
      );
  }

  return (
    <CustomizableCard widgetId="finance-balance">
      {body}

      <Modal visible={editing} transparent animationType="fade" onRequestClose={() => setEditing(false)}>
        <Pressable style={styles.backdrop} onPress={() => setEditing(false)}>
          <Pressable
            style={[styles.dialog, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={[styles.dialogTitle, { color: theme.colors.text }]}>{tr.financeScreen.editBankTitle}</Text>
            <Text style={[styles.dialogHint, { color: theme.colors.textMuted }]}>{tr.financeScreen.editBankHint}</Text>
            <TextField value={draft} onChangeText={setDraft} keyboardType="decimal-pad" autoFocus />
            <View style={styles.dialogActions}>
              <Button title={tr.taskEditor.cancel} variant="secondary" onPress={() => setEditing(false)} style={styles.dialogButton} />
              <Button title={tr.taskEditor.save} onPress={save} style={styles.dialogButton} />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </CustomizableCard>
  );
}

const styles = StyleSheet.create({
  columns: { flexDirection: 'row', alignItems: 'stretch' },
  column: { flex: 1, gap: 4 },
  divider: { width: 1, marginHorizontal: 14 },
  header: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 },
  amount: { fontSize: 22, fontWeight: '700' },
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
  totalLabel: { fontSize: 12, fontWeight: '600' },
  totalAmount: { fontSize: 19, fontWeight: '800' },
  plannedNote: { fontSize: 11, textAlign: 'right', marginTop: 2 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  dialog: { width: 280, borderRadius: 18, borderWidth: 1, padding: 18, gap: 12 },
  dialogTitle: { fontSize: 16, fontWeight: '700' },
  dialogHint: { fontSize: 12, lineHeight: 17, marginTop: -8 },
  dialogActions: { flexDirection: 'row', gap: 10 },
  dialogButton: { flex: 1 },

  heroWrap: { gap: 4 },
  heroAmount: { fontSize: 40, fontWeight: '700', textAlign: 'center' },
  heroPills: { flexDirection: 'row', gap: 10, marginTop: 14 },
  heroPill: { flex: 1, borderRadius: 18, padding: 12, gap: 3 },
  pillAmount: { fontSize: 19, fontWeight: '700' },

  ledgerRow: { paddingVertical: 8, gap: 2 },
  ledgerLine: { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  ledgerLabel: { fontSize: 15 },
  ledgerDots: { flex: 1, borderBottomWidth: 1, borderStyle: 'dotted', marginBottom: 5 },
  ledgerValue: { fontSize: 16, fontWeight: '700' },
  ledgerTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: 8,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderBottomWidth: 3,
    borderStyle: 'solid',
  },
  ledgerTotalValue: { fontSize: 22, fontWeight: '700' },

  blocksWrap: { gap: 10 },
  blocksRow: { flexDirection: 'row', gap: 10 },
  block: { borderRadius: 4, padding: 14, gap: 4 },
  blockHalf: { flex: 1, borderWidth: 2 },
  blockAmount: { fontSize: 34, fontWeight: '800' },
});
