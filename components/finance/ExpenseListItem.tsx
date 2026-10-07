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
  /** row: classic card · tile: half-width grid card · compact: line in a dated feed · big: large amount. */
  variant?: 'row' | 'tile' | 'compact' | 'big';
}

export function ExpenseListItem({ expense, category, currency, onPress, variant = 'row' }: ExpenseListItemProps) {
  const theme = useTheme();
  const tr = useTranslation();
  const color = category?.color ?? theme.colors.textMuted;
  const amount = `-${expense.amount.toFixed(0)} ${currency}`;
  const date = new Date(`${expense.date}T12:00:00`).toLocaleDateString(tr.localeCode, { day: 'numeric', month: 'short' });

  if (variant === 'tile') {
    return (
      <Pressable onPress={onPress} style={[styles.tile, cardSurface(theme)]}>
        <View style={[styles.tileBadge, { backgroundColor: `${color}33` }]}>
          <View style={[styles.dot, { backgroundColor: color }]} />
          <Text style={[styles.tileCategory, { color: theme.colors.text }]} numberOfLines={1}>
            {categoryLabel(category, tr)}
          </Text>
        </View>
        <Text style={[styles.tileAmount, { color: theme.colors.danger }]} numberOfLines={1} adjustsFontSizeToFit>
          {amount}
        </Text>
        <Text style={[styles.date, { color: theme.colors.textMuted }]} numberOfLines={1}>
          {expense.comment ? `${expense.comment} · ` : ''}
          {date}
        </Text>
      </Pressable>
    );
  }

  if (variant === 'compact') {
    return (
      <Pressable onPress={onPress} style={[styles.compact, { borderBottomColor: theme.colors.border }]}>
        <View style={[styles.compactBar, { backgroundColor: color }]} />
        <View style={styles.body}>
          <Text style={[styles.category, { color: theme.colors.text }]}>{categoryLabel(category, tr)}</Text>
          {expense.comment ? (
            <Text style={[styles.comment, { color: theme.colors.textMuted }]} numberOfLines={1}>
              {expense.comment}
            </Text>
          ) : null}
        </View>
        <Text style={[styles.compactAmount, { color: theme.colors.text }]}>{amount}</Text>
      </Pressable>
    );
  }

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

  tile: { flex: 1, padding: 12, gap: 8, minHeight: 104 },
  tileBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, maxWidth: '100%' },
  tileCategory: { fontSize: 12, fontWeight: '700', flexShrink: 1 },
  tileAmount: { fontSize: 22, fontWeight: '800' },

  compact: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  compactBar: { width: 4, alignSelf: 'stretch', borderRadius: 2 },
  compactAmount: { fontSize: 16, fontWeight: '700' },

  big: { padding: 16, gap: 6 },
  bigAmount: { fontSize: 30, fontWeight: '800' },
  bigMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
