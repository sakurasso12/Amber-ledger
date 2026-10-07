import React, { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { endOfMonth, endOfWeek, startOfMonth, startOfWeek } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { toDateKey, todayKey } from '@/lib/dateRanges';
import { useTranslation } from '@/i18n';

export interface DayMarker {
  /** Priority-coded dot colors for tasks due this day, deduped, most urgent first. */
  taskColors: string[];
  hasExpense: boolean;
}

interface MonthCalendarProps {
  month: Date;
  markers: Record<string, DayMarker>;
  selectedDate: string;
  onSelectDate: (dateKey: string) => void;
}

const MAX_TASK_DOTS = 3;

export function MonthCalendar({ month, markers, selectedDate, onSelectDate }: MonthCalendarProps) {
  const theme = useTheme();
  const tr = useTranslation();
  const today = todayKey();

  const weeks = useMemo(() => {
    const gridStart = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
    const gridEnd = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
    const currentMonth = month.getMonth();

    const days: { date: Date; inMonth: boolean }[] = [];
    const cursor = new Date(gridStart);
    while (cursor <= gridEnd) {
      days.push({ date: new Date(cursor), inMonth: cursor.getMonth() === currentMonth });
      cursor.setDate(cursor.getDate() + 1);
    }

    const result: { date: Date; inMonth: boolean }[][] = [];
    for (let i = 0; i < days.length; i += 7) {
      result.push(days.slice(i, i + 7));
    }
    return result;
  }, [month]);

  return (
    <View>
      <View style={styles.weekdayRow}>
        {tr.weekdaysShort.map((label) => (
          <Text key={label} style={[styles.weekdayLabel, { color: theme.colors.textMuted }]}>
            {label}
          </Text>
        ))}
      </View>

      {weeks.map((week, i) => (
        <View key={i} style={styles.weekRow}>
          {week.map(({ date, inMonth }) => {
            const key = toDateKey(date);
            const marker = markers[key];
            const isSelected = key === selectedDate;
            const isToday = key === today;

            return (
              <Pressable key={key} onPress={() => onSelectDate(key)} style={styles.dayCell}>
                <View
                  style={[
                    styles.dayInner,
                    isSelected && { backgroundColor: theme.colors.primary },
                    !isSelected && isToday && { borderWidth: 1, borderColor: theme.colors.primary },
                  ]}
                >
                  <Text
                    style={[
                      styles.dayText,
                      {
                        color: isSelected
                          ? theme.colors.primaryText
                          : inMonth
                          ? theme.colors.text
                          : theme.colors.textMuted,
                      },
                    ]}
                  >
                    {date.getDate()}
                  </Text>
                  {marker && (marker.taskColors.length > 0 || marker.hasExpense) ? (
                    <View style={styles.markerRow}>
                      {marker.taskColors.slice(0, MAX_TASK_DOTS).map((color, i) => (
                        <View
                          key={i}
                          style={[styles.marker, { backgroundColor: isSelected ? theme.colors.primaryText : color }]}
                        />
                      ))}
                      {marker.hasExpense ? (
                        <Ionicons
                          name="cash-outline"
                          size={7}
                          color={isSelected ? theme.colors.primaryText : theme.colors.accent}
                        />
                      ) : null}
                    </View>
                  ) : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  weekdayRow: { flexDirection: 'row', marginBottom: 6 },
  weekdayLabel: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '700' },
  weekRow: { flexDirection: 'row' },
  dayCell: { flex: 1, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  dayInner: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: { fontSize: 13, fontWeight: '600' },
  markerRow: { position: 'absolute', bottom: 3, flexDirection: 'row', gap: 2, alignItems: 'center' },
  marker: { width: 4, height: 4, borderRadius: 2 },
});
