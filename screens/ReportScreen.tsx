import React, { useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { addMonths, endOfMonth, isAfter, startOfMonth } from 'date-fns';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { Button, Screen, SubScreenHeader } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';
import { useFinanceStore, useSpendingExpenses } from '@/store/useFinanceStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useTaskStore } from '@/store/useTaskStore';
import { useTranslation } from '@/i18n';
import { categoryLabel } from '@/lib/categoryLabel';
import { toDateKey } from '@/lib/dateRanges';
import { fmtAmount } from '@/lib/money';
import { TymofiiFace } from '@/components/mascot/Tymofii';

/** Sum of in-app-currency expenses between two yyyy-MM-dd keys (inclusive). */
function spentBetween(expenses: { date: string; amount: number }[], from: string, to: string): number {
  return expenses.filter((e) => e.date >= from && e.date <= to).reduce((s, e) => s + e.amount, 0);
}

/**
 * Monthly report (1.7): the month's results as one card that can be shared as an image
 * (react-native-view-shot → expo-sharing). Arrows switch months; the current month is the default.
 */
export function ReportScreen() {
  const theme = useTheme();
  const tr = useTranslation();
  const insets = useSafeAreaInsets();
  const spending = useSpendingExpenses();
  const categories = useFinanceStore((s) => s.categories);
  const incomes = useFinanceStore((s) => s.incomes);
  const tasks = useTaskStore((s) => s.tasks);
  const currency = useSettingsStore((s) => s.settings.currency);
  const mascot = useSettingsStore((s) => s.settings.mascotEnabled);
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [busy, setBusy] = useState(false);
  const cardRef = useRef<View>(null);

  const data = useMemo(() => {
    const from = toDateKey(startOfMonth(month));
    const to = toDateKey(endOfMonth(month));
    const prev = addMonths(month, -1);
    const spent = spentBetween(spending, from, to);
    const prevSpent = spentBetween(spending, toDateKey(startOfMonth(prev)), toDateKey(endOfMonth(prev)));
    const income = incomes.filter((i) => i.date >= from && i.date <= to).reduce((s, i) => s + i.amount, 0);
    const done = tasks.filter((t) => t.completedAt && t.completedAt.slice(0, 10) >= from && t.completedAt.slice(0, 10) <= to).length;
    const byCat = new Map<string, number>();
    for (const e of spending) if (e.date >= from && e.date <= to) byCat.set(e.categoryId, (byCat.get(e.categoryId) ?? 0) + e.amount);
    const top = [...byCat.entries()]
      .map(([id, total]) => ({ id, total, category: categories.find((c) => c.id === id) }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
    return { spent, prevSpent, income, done, top };
  }, [month, spending, incomes, tasks, categories]);

  const monthName = month.toLocaleDateString(tr.localeCode, { month: 'long' });
  const title = monthName.charAt(0).toUpperCase() + monthName.slice(1);
  const money = (n: number) => `${fmtAmount(n)} ${currency}`;
  const diff = data.prevSpent > 0 ? Math.round(((data.spent - data.prevSpent) / data.prevSpent) * 100) : null;
  const max = data.top[0]?.total ?? 1;
  const weeks = Math.max(1, Math.round((endOfMonth(month).getDate() / 7) * 10) / 10);
  const canNext = !isAfter(addMonths(month, 1), startOfMonth(new Date()));

  async function share() {
    if (!cardRef.current || busy) return;
    setBusy(true);
    try {
      if (Platform.OS === 'web') {
        // Web / desktop: no share sheet — the picture is downloaded as a PNG instead.
        const dataUrl = await captureRef(cardRef, { format: 'png', quality: 1, result: 'data-uri' });
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = `amber-ledger-${title.replace(/[^\p{L}\p{N}]+/gu, '-')}.png`;
        link.click();
        return;
      }
      const uri = await captureRef(cardRef, { format: 'png', quality: 1, result: 'tmpfile' });
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: tr.report.title });
    } catch (e) {
      console.warn('[report] share failed', e);
    } finally {
      setBusy(false);
    }
  }

  const tile = (label: string, value: string, sub: string) => (
    <View style={[styles.tile, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      <Text style={[styles.tileLabel, { color: theme.colors.textMuted }]}>{label}</Text>
      <Text style={[styles.tileValue, { color: theme.colors.text }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={[styles.tileSub, { color: theme.colors.textMuted }]}>{sub}</Text>
    </View>
  );

  return (
    <Screen style={{ paddingTop: insets.top }}>
      <SubScreenHeader title={tr.report.title} />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.switcher}>
          <Pressable onPress={() => setMonth(addMonths(month, -1))} hitSlop={10} accessibilityLabel="previous month">
            <Ionicons name="chevron-back" size={22} color={theme.colors.text} />
          </Pressable>
          <Text style={[styles.switcherText, { color: theme.colors.text }]}>
            {title} {month.getFullYear()}
          </Text>
          <Pressable onPress={() => canNext && setMonth(addMonths(month, 1))} hitSlop={10} disabled={!canNext} accessibilityLabel="next month">
            <Ionicons name="chevron-forward" size={22} color={canNext ? theme.colors.text : theme.colors.border} />
          </Pressable>
        </View>

        {/* This View is what gets saved as the image. */}
        <View ref={cardRef} collapsable={false} style={[styles.card, { backgroundColor: theme.colors.background }]}>
          <View style={styles.cardHead}>
            <View style={styles.flex}>
              <Text style={[styles.kicker, { color: theme.colors.accent }]}>{tr.report.kicker}</Text>
              <Text style={[styles.monthTitle, { color: theme.colors.text }]}>{title}</Text>
            </View>
            {mascot ? <TymofiiFace mood={diff !== null && diff > 0 ? 'worried' : 'stars'} prop={diff !== null && diff > 0 ? 'sweat' : 'party'} size={96} /> : null}
          </View>
          <View style={styles.grid}>
            {tile(tr.report.spent, money(data.spent), diff === null ? tr.report.noPrev : tr.report.vsPrev(Math.abs(diff), diff > 0))}
            {tile(tr.report.income, money(data.income), title)}
            {tile(tr.report.tasksDone, String(data.done), tr.report.tasksSub(Math.round(data.done / weeks)))}
          </View>
          <View style={[styles.where, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <Text style={[styles.tileLabel, { color: theme.colors.textMuted }]}>{tr.report.where}</Text>
            {data.top.length === 0 ? <Text style={[styles.tileSub, { color: theme.colors.textMuted }]}>{tr.report.nothing}</Text> : null}
            {data.top.map((row) => (
              <View key={row.id} style={styles.barRow}>
                <Text style={[styles.barName, { color: theme.colors.text }]} numberOfLines={1}>
                  {row.category ? categoryLabel(row.category, tr) : '—'}
                </Text>
                <View style={[styles.barTrack, { backgroundColor: theme.colors.surfaceAlt }]}>
                  <View style={[styles.barFill, { width: `${Math.max(4, (row.total / max) * 100)}%`, backgroundColor: row.category?.color ?? theme.colors.primary }]} />
                </View>
                <Text style={[styles.barValue, { color: theme.colors.text }]}>{fmtAmount(row.total)}</Text>
              </View>
            ))}
          </View>
          <View style={styles.footer}>
            <Text style={[styles.brand, { color: theme.colors.text }]}>Amber Ledger</Text>
            <Text style={[styles.tileSub, { color: theme.colors.textMuted }]}>{tr.report.tagline}</Text>
          </View>
        </View>

        <Button title={tr.report.share} onPress={share} disabled={busy} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, gap: 14 },
  flex: { flex: 1 },
  switcher: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 18 },
  switcherText: { fontSize: 16, fontWeight: '700', minWidth: 150, textAlign: 'center' },
  card: { borderRadius: 22, padding: 18, gap: 12 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  kicker: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
  monthTitle: { fontSize: 36, fontWeight: '900' },
  grid: { gap: 10 },
  tile: { borderWidth: 1, borderRadius: 18, padding: 14, gap: 2 },
  tileLabel: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  tileValue: { fontSize: 26, fontWeight: '900' },
  tileSub: { fontSize: 12 },
  where: { borderWidth: 1, borderRadius: 18, padding: 14, gap: 10 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  barName: { width: 92, fontSize: 13, fontWeight: '600' },
  barTrack: { flex: 1, height: 12, borderRadius: 6, overflow: 'hidden' },
  barFill: { height: 12, borderRadius: 6 },
  barValue: { width: 70, textAlign: 'right', fontSize: 13, fontWeight: '700' },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4 },
  brand: { fontSize: 16, fontWeight: '900' },
});
