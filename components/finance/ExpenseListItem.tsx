import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { categoryLabel } from '@/lib/categoryLabel';
import { useTranslation } from '@/i18n';
import { useTheme } from '@/theme/ThemeProvider';
import { cardSurface } from '@/theme/surfaces';
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
  const amount = `-${expense.amount.toFixed(0)} ${currency}`;
  const date = new Date(`${expense.date}T12:00:00`).toLocaleDateString(tr.localeCode, { day: 'numeric', month: 'short' });

  if (variant === 'big') {
    return (
      <Pressable onPress={onPress} style={[styles.big, cardSurface(theme)]}>
        <Text style={[styles.bigAmount, { color: theme.colors.danger }]}>{amount}</Text>
        <View style={styles.bigMeta}>
          <View style={[styles.dot, { backgroundColor: color }]} />
          <Text style={[styles.category, { color: theme.colors.text, flexShrink: 1 }]} numberOfLines={1}>
            {categoryLabel(category, tr)}
            {expense.comment ? ` · ${expense.comment}` : ''}
          </Text>
          <Text style={[styles.date, { color: theme.colors.textMuted, marginLeft: 'auto' }]}>{date}</Text>
        </View>
      </Pressable>
    );
  }

  return (
    <Pressable onPress={onPress} style={[styles.row, cardSurface(theme)]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <View style={styles.body}>
        <Text style={[styles.category, { color: theme.colors.text }]}>{categoryLabel(category, tr)}</Text>
        {expense.comment ? (
          <Text style={[styles.comment, { color: theme.colors.textMuted }]} numberOfLines={1}>
            {expense.comment}
          </Text>
        ) : null}
        <Text style={[styles.date, { color: theme.colors.textMuted }]}>{date}</Text>
      </View>
      <Text style={[styles.amount, { color: theme.colors.danger }]}>{amount}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  body: { flex: 1, gap: 2 },
  category: { fontSize: 15, fontWeight: '600' },
  comment: { fontSize: 12 },
  date: { fontSize: 11 },
  amount: { fontSize: 18, fontWeight: '800' },

  big: { padding: 16, gap: 6 },
  bigAmount: { fontSize: 30, fontWeight: '800' },
  bigMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
