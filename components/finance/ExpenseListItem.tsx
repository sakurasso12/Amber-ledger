import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/theme/ThemeProvider';
import { cardSurface } from '@/theme/surfaces';
import { Category, Expense } from '@/types';

interface ExpenseListItemProps {
  expense: Expense;
  category: Category | undefined;
  currency: string;
  onPress: () => void;
}

export function ExpenseListItem({ expense, category, currency, onPress }: ExpenseListItemProps) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={[styles.row, cardSurface(theme)]}
    >
      <View style={[styles.dot, { backgroundColor: category?.color ?? theme.colors.textMuted }]} />
      <View style={styles.body}>
        <Text style={[styles.category, { color: theme.colors.text }]}>{category?.name ?? '—'}</Text>
        {expense.comment ? (
          <Text style={[styles.comment, { color: theme.colors.textMuted }]} numberOfLines={1}>
            {expense.comment}
          </Text>
        ) : null}
        <Text style={[styles.date, { color: theme.colors.textMuted }]}>
          {new Date(expense.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
        </Text>
      </View>
      <Text style={[styles.amount, { color: theme.colors.danger }]}>
        -{expense.amount.toFixed(0)} {currency}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  body: { flex: 1, gap: 2 },
  category: { fontSize: 15, fontWeight: '600' },
  comment: { fontSize: 12 },
  date: { fontSize: 11 },
  amount: { fontSize: 18, fontWeight: '800' },
});
