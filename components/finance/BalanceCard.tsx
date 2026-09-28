import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { CustomizableCard, Button, TextField } from '@/components/ui';
import { useTranslation } from '@/i18n';

interface BalanceCardProps {
  /** Manually-set cash on hand — see lib/expenses.ts computeBankBalance. */
  bank: number;
  spentSinceSet: number;
  onEditBank: (newBase: number) => void;
  /** Expected earnings for the current pay period (see Settings → Заработок → период). */
  incoming: number;
  incomingLabel: string;
  /** Known future expenses not yet paid — subtracted from the projected total. */
  plannedTotal: number;
  currency: string;
}

export function BalanceCard({ bank, spentSinceSet, onEditBank, incoming, incomingLabel, plannedTotal, currency }: BalanceCardProps) {
  const theme = useTheme();
  const tr = useTranslation();
  const bankColor = bank >= 0 ? theme.colors.success : theme.colors.danger;
  const total = bank + incoming - plannedTotal;

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

  return (
    <CustomizableCard widgetId="finance-balance">
      <View style={styles.columns}>
        <Pressable style={styles.column} onPress={openEditor}>
          <Text style={[styles.header, { color: theme.colors.textMuted }]}>
            {tr.financeScreen.bank} <Text style={{ color: theme.colors.accent }}>✏️</Text>
          </Text>
          <Text style={[styles.amount, { color: bankColor }]}>
            {bank >= 0 ? '+' : ''}
            {bank.toFixed(0)} {currency}
          </Text>
          <Text style={[styles.subline, { color: theme.colors.textMuted }]}>
            {tr.financeScreen.spent.toLowerCase()}: {spentSinceSet.toFixed(0)}
          </Text>
        </Pressable>

        <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

        <View style={styles.column}>
          <Text style={[styles.header, { color: theme.colors.textMuted }]}>{tr.financeScreen.incoming}</Text>
          <Text style={[styles.amount, { color: theme.colors.accent }]}>
            {incoming.toFixed(0)} {currency}
          </Text>
          <Text style={[styles.subline, { color: theme.colors.textMuted }]}>{incomingLabel}</Text>
        </View>
      </View>

      <View style={[styles.totalRow, { borderTopColor: theme.colors.border }]}>
        <Text style={[styles.totalLabel, { color: theme.colors.textMuted }]}>{tr.financeScreen.total}</Text>
        <Text style={[styles.totalAmount, { color: total >= 0 ? theme.colors.success : theme.colors.danger }]}>
          {total >= 0 ? '+' : ''}
          {total.toFixed(0)} {currency}
        </Text>
      </View>
      {plannedTotal > 0 ? (
        <Text style={[styles.plannedNote, { color: theme.colors.textMuted }]}>
          {tr.financeScreen.plannedIncluded}: -{plannedTotal.toFixed(0)}
        </Text>
      ) : null}

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
});
