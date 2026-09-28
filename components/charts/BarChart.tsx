import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { useTheme } from '@/theme/ThemeProvider';
import { useTranslation } from '@/i18n';

export interface BarChartPoint {
  label: string;
  value: number;
}

interface BarChartProps {
  data: BarChartPoint[];
  color?: string;
  height?: number;
  formatValue?: (n: number) => string;
}

const BAR_GAP = 10;

export function BarChart({ data, color, height = 160, formatValue }: BarChartProps) {
  const theme = useTheme();
  const tr = useTranslation();
  const barColor = color ?? theme.colors.primary;
  const max = Math.max(1, ...data.map((d) => d.value));
  const chartHeight = height - 28;

  if (data.length === 0) {
    return (
      <View style={[styles.empty, { height }]}>
        <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>{tr.charts.noDataForPeriod}</Text>
      </View>
    );
  }

  return (
    <View style={{ height }}>
      <View style={styles.row}>
        {data.map((d, i) => {
          const barHeight = Math.max(2, (d.value / max) * chartHeight);
          return (
            <View key={`${d.label}-${i}`} style={styles.barColumn}>
              <View style={{ height: chartHeight, justifyContent: 'flex-end', width: '100%', alignItems: 'center' }}>
                {d.value > 0 ? (
                  <Text style={[styles.value, { color: theme.colors.textMuted }]} numberOfLines={1}>
                    {formatValue ? formatValue(d.value) : d.value.toFixed(0)}
                  </Text>
                ) : null}
                <Svg width="70%" height={barHeight}>
                  <Rect x="0" y="0" width="100%" height={barHeight} rx={4} fill={barColor} />
                </Svg>
              </View>
              <Text style={[styles.label, { color: theme.colors.textMuted }]} numberOfLines={1}>
                {d.label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flex: 1, flexDirection: 'row', alignItems: 'flex-end', gap: BAR_GAP },
  barColumn: { flex: 1, alignItems: 'center' },
  value: { fontSize: 9, marginBottom: 2 },
  label: { fontSize: 10, marginTop: 4 },
  empty: { alignItems: 'center', justifyContent: 'center' },
});
