import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { categoryLabel } from '@/lib/categoryLabel';
import { useTheme } from '@/theme/ThemeProvider';
import { CategoryBreakdownEntry } from '@/types';
import { useTranslation } from '@/i18n';

export function CategoryBreakdownBars({ entries, currency }: { entries: CategoryBreakdownEntry[]; currency: string }) {
  const theme = useTheme();
  const tr = useTranslation();

  if (entries.length === 0) {
    return <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>{tr.charts.noExpensesForPeriod}</Text>;
  }

  return (
    <View style={styles.wrapper}>
      {entries.map((entry) => (
        <View key={entry.categoryId} style={styles.row}>
          <View style={styles.labelRow}>
            <Text style={[styles.name, { color: theme.colors.text }]}>{categoryLabel({ id: entry.categoryId, name: entry.categoryName }, tr)}</Text>
            <Text style={[styles.amount, { color: theme.colors.textMuted }]}>
              {entry.total.toFixed(0)} {currency} · {entry.percentage.toFixed(0)}%
            </Text>
          </View>
          <View style={[styles.track, { backgroundColor: theme.colors.surfaceAlt }]}>
            <View style={[styles.fill, { width: `${entry.percentage}%`, backgroundColor: entry.categoryColor }]} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 12 },
  row: { gap: 6 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between' },
  name: { fontSize: 13, fontWeight: '600' },
  amount: { fontSize: 12 },
  track: { height: 8, borderRadius: 4, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4 },
});
