import React from 'react';
import { StyleSheet, View } from 'react-native';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { categoryLabel } from '@/lib/categoryLabel';
import { useTranslation } from '@/i18n';
import { useTheme } from '@/theme/ThemeProvider';
import { cardSurface } from '@/theme/surfaces';
import { useFinanceLocked } from '@/store/useFinanceLock';
import { Category, Expense } from '@/types';

interface ExpenseListItemProps {
  expense: Expense;
  category: Category | undefined;
  currency: string;
  onPress: () => void;
  /** row: classic card · big: large amount (Vertical layout). */
  variant?: 'row' | 'big';
}

export function ExpenseListItem({ expense, category, currency, onPress, variant = 'row' }: ExpenseListItemProps) {
  const theme = useTheme();
  const tr = useTranslation();
  const color = category?.color ?? theme.colors.textMuted;
  // Hidden while Finance is locked (Settings → Security) — this row also shows up in Calendar.
  const amount = useFinanceLocked() ? `•••• ${currency}` : `-${expense.amount.toFixed(0)} ${currency}`;
  const date = new Date(`${expense.date}T12:00:00`).toLocaleDateString(tr.localeCode, { day: 'numeric', month: 'short' });
  // Spending plans: the limit taken off is tagged "Plan"; going past the limit is marked in red.
  const overspend = expense.planRole === 'overspend';
  const tag =
    expense.planRole === 'reserve' ? tr.plans.planTag : overspend ? tr.plans.overspend : null;
  const tagView = tag ? (
    <Text style={[styles.tag, { color: overspend ? theme.colors.danger : theme.colors.primary, backgroundColor: overspend ? `${theme.colors.danger}1A` : `${theme.colors.primary}1A` }]}>
      {tag}
    </Text>
  ) : null;
  const overspendBorder = overspend ? { borderColor: theme.colors.danger, borderWidth: 1.5 } : null;

  if (variant === 'big') {
    return (
      <PressableScale onPress={onPress} style={[styles.big, cardSurface(theme), overspendBorder]}>
        <Text style={[styles.bigAmount, { color: theme.colors.danger }]}>{amount}</Text>
        <View style={styles.bigMeta}>
          <View style={[styles.dot, { backgroundColor: color }]} />
          <Text style={[styles.category, { color: theme.colors.text, flexShrink: 1 }]} numberOfLines={1}>
            {categoryLabel(category, tr)}
            {expense.comment ? ` · ${expense.comment}` : ''}
          </Text>
          {tagView}
          <Text style={[styles.date, { color: theme.colors.textMuted, marginLeft: 'auto' }]}>{date}</Text>
        </View>
      </PressableScale>
    );
  }

  return (
    <PressableScale onPress={onPress} style={[styles.row, cardSurface(theme), overspendBorder]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={[styles.category, { color: theme.colors.text, flexShrink: 1 }]} numberOfLines={1}>
            {categoryLabel(category, tr)}
          </Text>
          {tagView}
        </View>
        {expense.comment ? (
          <Text style={[styles.comment, { color: theme.colors.textMuted }]} numberOfLines={1}>
            {expense.comment}
          </Text>
        ) : null}
        <Text style={[styles.date, { color: theme.colors.textMuted }]}>{date}</Text>
      </View>
      <Text style={[styles.amount, { color: theme.colors.danger }]}>{amount}</Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tag: { fontSize: 11, fontWeight: '800', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8, overflow: 'hidden' },
  body: { flex: 1, gap: 2 },
  category: { fontSize: 15, fontWeight: '600' },
  comment: { fontSize: 12 },
  date: { fontSize: 11 },
  amount: { fontSize: 18, fontWeight: '800' },

  big: { padding: 16, gap: 6 },
  bigAmount: { fontSize: 30, fontWeight: '800' },
  bigMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
