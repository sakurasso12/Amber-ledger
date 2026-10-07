import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { addMonths, endOfMonth, endOfWeek, startOfMonth, startOfWeek } from 'date-fns';
import { useTheme } from '@/theme/ThemeProvider';
import { useFinanceStore } from '@/store/useFinanceStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { payPeriodRange, toDateKey } from '@/lib/dateRanges';
import { totalEarnings, workedDaysCount } from '@/lib/earnings';
import { useTranslation } from '@/i18n';

/** Tap cycles a day through: unset → worked (green) → day off (red) → unset. Days before the
 * start of the current pay period are read-only and shown muted — no manual "close period" step
 * needed, it just follows the period boundary from Settings → Заработок. */
export function WorkCalendar() {
  const theme = useTheme();
  const tr = useTranslation();
  const [month, setMonth] = useState(new Date());
  const workDays = useFinanceStore((s) => s.workDays);
  const setWorkDay = useFinanceStore((s) => s.setWorkDay);
  const clearWorkDay = useFinanceStore((s) => s.clearWorkDay);
  const settings = useSettingsStore((s) => s.settings);

  const workDayByDate = useMemo(() => new Map(workDays.map((w) => [w.date, w])), [workDays]);

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
    for (let i = 0; i < days.length; i += 7) result.push(days.slice(i, i + 7));
    return result;
  }, [month]);

  // The period containing "today" — anything before its start belongs to an already-closed
  // period and is locked/greyed automatically.
  const currentPeriodStart = useMemo(() => payPeriodRange(new Date(), settings.payPeriodStartDay).start, [settings.payPeriodStartDay]);
  const currentPeriodStartKey = useMemo(() => toDateKey(currentPeriodStart), [currentPeriodStart]);

  function cycleDay(dateKey: string) {
    if (dateKey < currentPeriodStartKey) return; // past period — read-only

    const existing = workDayByDate.get(dateKey);
    if (!existing) {
      setWorkDay(dateKey, true);
    } else if (existing.isWorked) {
      setWorkDay(dateKey, false);
    } else {
      clearWorkDay(dateKey);
    }
  }

  // Summary reflects the pay period that the displayed month falls in, not the raw calendar month.
  const displayedPeriod = useMemo(
    () => payPeriodRange(new Date(month.getFullYear(), month.getMonth(), 15), settings.payPeriodStartDay),
    [month, settings.payPeriodStartDay]
  );
  const worked = workedDaysCount(workDays, displayedPeriod);
  const off = workDays.filter((w) => !w.isWorked && toDateInRange(w.date, displayedPeriod)).length;
  const earned = totalEarnings(workDays, settings, displayedPeriod);
  const monthLabel = month.toLocaleDateString(tr.localeCode, { month: 'long', year: 'numeric' });

  return (
    <View>
      <View style={styles.monthNav}>
        <Pressable onPress={() => setMonth((m) => addMonths(m, -1))} hitSlop={8}>
          <Text style={[styles.navArrow, { color: theme.colors.primary }]}>‹</Text>
        </Pressable>
        <Text style={[styles.monthLabel, { color: theme.colors.text }]}>{monthLabel}</Text>
        <Pressable onPress={() => setMonth((m) => addMonths(m, 1))} hitSlop={8}>
          <Text style={[styles.navArrow, { color: theme.colors.primary }]}>›</Text>
        </Pressable>
      </View>

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
            const record = workDayByDate.get(key);
            const isPast = key < currentPeriodStartKey;
            const bg = isPast
              ? record
                ? theme.colors.surfaceAlt
                : 'transparent'
              : record
              ? record.isWorked
                ? theme.colors.success
                : theme.colors.danger
              : 'transparent';
            const textColor = isPast
              ? theme.colors.textMuted
              : record
              ? theme.colors.primaryText
              : inMonth
              ? theme.colors.text
              : theme.colors.textMuted;

            return (
              <Pressable key={key} onPress={() => cycleDay(key)} style={styles.dayCell}>
                <View style={[styles.dayInner, { backgroundColor: bg }]}>
                  <Text style={[styles.dayText, { color: textColor }]}>{date.getDate()}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}

      <View style={styles.summaryRow}>
        <Text style={[styles.summaryItem, { color: theme.colors.success }]}>{tr.workCalendar.worked}: {worked}</Text>
        <Text style={[styles.summaryItem, { color: theme.colors.danger }]}>{tr.workCalendar.off}: {off}</Text>
        <Text style={[styles.summaryItem, { color: theme.colors.text }]}>
          ≈ {earned.toFixed(0)} {settings.currency}
        </Text>
      </View>
    </View>
  );
}

function toDateInRange(dateKey: string, range: { start: Date; end: Date }): boolean {
  const d = new Date(dateKey);
  return d >= range.start && d <= range.end;
}

const styles = StyleSheet.create({
  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20, marginBottom: 8 },
  navArrow: { fontSize: 22, fontWeight: '700', paddingHorizontal: 10 },
  monthLabel: { fontSize: 15, fontWeight: '700', textTransform: 'capitalize', minWidth: 150, textAlign: 'center' },
  weekdayRow: { flexDirection: 'row', marginBottom: 4 },
  weekdayLabel: { flex: 1, textAlign: 'center', fontSize: 10, fontWeight: '700' },
  weekRow: { flexDirection: 'row' },
  dayCell: { flex: 1, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  dayInner: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  dayText: { fontSize: 12, fontWeight: '600' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  summaryItem: { fontSize: 13, fontWeight: '700' },
});
