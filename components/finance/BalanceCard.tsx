import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/theme/ThemeProvider';
import { CustomizableCard, Button, TextField, useKeyboardHeight } from '@/components/ui';
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
  const keyboardHeight = useKeyboardHeight();
  const tr = useTranslation();
  const bankColor = bank >= 0 ? theme.colors.success : theme.colors.danger;
  // What will be on the card once the salary for the closed period arrives. The still-accruing
  // current period is left out — that money isn't earned yet.
  const total = bank + awaiting - plannedTotal;

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
  switch (theme.layout.balance) {
    // Neon: the projected total is the hero, bank and incoming sit underneath as two pills.
    case 'hero':
      body = (
        <View style={styles.heroWrap}>
          <Text style={[styles.header, { color: muted, textAlign: 'center' }]}>{tr.financeScreen.total}</Text>
          <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.heroAmount, { color: totalColor }]}>{signed(total)}</Text>
          {plannedNote}
          <View style={styles.heroPills}>
            <Pressable onPress={openEditor} style={[styles.heroPill, { backgroundColor: theme.colors.surfaceAlt }]}>
              <Text style={[styles.header, { color: muted }]}>{tr.financeScreen.bank} ✏️</Text>
              <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.pillAmount, { color: bankColor }]}>{signed(bank)}</Text>
              {bankDetails}
            </Pressable>
            <View style={[styles.heroPill, { backgroundColor: theme.colors.surfaceAlt }]}>
              <Text style={[styles.header, { color: muted }]}>{tr.financeScreen.incoming}</Text>
              {awaitingLabel ? (
                <>
                  <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.pillAmount, { color: theme.colors.accent }]}>{money(awaiting)}</Text>
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
              <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.amount, { color: bankColor }]}>{signed(bank)}</Text>
              {bankDetails}
            </Pressable>

            <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

            <View style={styles.column}>
              <Text style={[styles.header, { color: muted }]}>{tr.financeScreen.incoming}</Text>
              {awaitingLabel ? (
                <>
                  <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.amount, { color: theme.colors.accent }]}>{money(awaiting)}</Text>
                  <Text style={[styles.subline, { color: muted }]}>{awaitingLabel}</Text>
                </>
              ) : null}
              <Text numberOfLines={1} adjustsFontSizeToFit style={[awaitingLabel ? styles.accruingAmount : styles.amount, { color: muted }]}>
                {awaitingLabel ? '+ ' : ''}
                {money(accruing)}
              </Text>
              <Text style={[styles.subline, { color: muted }]}>{accruingLine}</Text>
            </View>
          </View>

          <View style={[styles.totalRow, { borderTopColor: theme.colors.border }]}>
            <Text style={[styles.totalLabel, { color: muted }]}>{tr.financeScreen.total}</Text>
            <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.totalAmount, { color: totalColor }]}>{signed(total)}</Text>
          </View>
          {plannedNote}
        </>
      );
  }

  return (
    <CustomizableCard widgetId="finance-balance">
      {body}

      <Modal visible={editing} transparent animationType="fade" onRequestClose={() => setEditing(false)}>
        <Pressable style={[styles.backdrop, { paddingBottom: keyboardHeight }]} onPress={() => setEditing(false)}>
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
  totalLabel: { fontSize: 12, fontWeight: '600', flexShrink: 1, marginRight: 10 },
  totalAmount: { fontSize: 19, fontWeight: '800', flexShrink: 1, textAlign: 'right' },
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
});
