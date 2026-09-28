import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { priorityColor } from '@/theme/theme';
import { useTranslation } from '@/i18n';
import { Priority } from '@/types';

export function PriorityBadge({ priority }: { priority: Priority }) {
  const theme = useTheme();
  const tr = useTranslation();
  const color = priorityColor(theme, priority);
  const label = { low: tr.priority.low, medium: tr.priority.medium, high: tr.priority.high }[priority];

  return (
    <View style={[styles.badge, { backgroundColor: `${color}26`, borderColor: color }]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.text, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 100,
    borderWidth: 1,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  text: { fontSize: 11, fontWeight: '700' },
});
