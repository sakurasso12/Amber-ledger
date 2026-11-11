import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import Svg from 'react-native-svg';
import { Easing, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { addMonths, endOfMonth, startOfMonth } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { useFinanceStore, useSpendingExpenses } from '@/store/useFinanceStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { confirmWithDevice, deviceAuthAvailable } from '@/store/useFinanceLock';
import { checkProfilePassword } from '@/lib/password';
import { categoryLabel } from '@/lib/categoryLabel';
import { parseDateKey, toDateKey, todayKey } from '@/lib/dateRanges';
import { haptics } from '@/lib/haptics';
import { Button, PressableScale, Text, TextField } from '@/components/ui';
import { useTranslation } from '@/i18n';
import { Category } from '@/types';
import { BAR_HEIGHT, FILL, Wave } from './Wave';
import { MoneyDialog } from './MoneyDialog';
import { CategoryPicker } from './CategoryPicker';
import { removeExpenseAsking } from './balanceQuestion';
import { fmtAmount, amountDraft } from '@/lib/money';

const parse = (text: string) => {
  const n = parseFloat(text.replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
};

/**
 * Month the "keep or change the budget?" question is about, or null when it isn't time to ask:
 * from the last day of a month (about the next one) through the 3rd of the new month.
 */
export function budgetQuestionMonth(today: string = todayKey()): string | null {
  const date = parseDateKey(today);
  if (today === toDateKey(endOfMonth(date))) return toDateKey(startOfMonth(addMonths(date, 1)));
  if (date.getDate() <= 3) return toDateKey(startOfMonth(date));
  return null;
}

/**
 * A category budget in Finance (finance v2 — replaces spending plans). Nothing is reserved: the
 * bar just shows this month's spending in the category against its limit, filled by a rolling
 * wave; past 100 % it turns red. Tap → log a purchase, see the month's purchases, change the
 * limit (confirmed with the profile password or the phone's lock), remove the budget.
 */
export function BudgetBar({ category, disabled = false }: { category: Category; disabled?: boolean }) {
  const theme = useTheme();
  const tr = useTranslation();
  const currency = useSettingsStore((s) => s.settings.currency);
  const choice = useSettingsStore((s) => s.settings.budgetMonthChoice[category.id]);
  const spending = useSpendingExpenses();
  const limit = category.limitMonth ?? 0;
  const today = todayKey();
  const monthStart = toDateKey(startOfMonth(parseDateKey(today)));
  const spent = useMemo(
    () => spending.filter((e) => e.categoryId === category.id && e.date >= monthStart && e.date <= today).reduce((s, e) => s + e.amount, 0),
    [spending, category.id, monthStart, today]
  );
  const ratio = limit > 0 ? spent / limit : 0;
  const over = ratio > 1;
  const [width, setWidth] = useState(0);
  const [sheet, setSheet] = useState<null | 'main' | 'limit'>(null);

  const fill = useSharedValue(0);
  const phase = useSharedValue(0);
  useEffect(() => {
    fill.value = withTiming(Math.min(1, ratio), FILL);
  }, [ratio, fill]);
  useEffect(() => {
    phase.value = withRepeat(withTiming(2 * Math.PI, { duration: 2600, easing: Easing.linear }), -1, false);
  }, [phase]);

  const fillColor = over ? theme.colors.danger : theme.colors.primary;
  const empty = theme.dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)';
  const askMonth = budgetQuestionMonth(today);
  const ask = askMonth !== null && (choice ?? '') < askMonth;
  const rest = limit - spent;

  function keep() {
    const { settings, updateSettings } = useSettingsStore.getState();
    if (askMonth) updateSettings({ budgetMonthChoice: { ...settings.budgetMonthChoice, [category.id]: askMonth } });
    haptics.tap();
  }

  return (
    <View style={styles.wrap}>
      <PressableScale
        disabled={disabled}
        onPress={() => setSheet('main')}
        scaleTo={0.98}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        style={[styles.bar, { backgroundColor: empty, borderRadius: theme.design.radius.card, borderColor: over ? theme.colors.danger : 'transparent' }]}
      >
        {width > 0 ? (
          <Svg width={width} height={BAR_HEIGHT} style={StyleSheet.absoluteFill}>
            <Wave width={width} fill={fill} phase={phase} offset={0} color={fillColor} opacity={0.55} />
          </Svg>
        ) : null}
        <View style={styles.left}>
          <Text style={[styles.name, { color: theme.colors.text }]} numberOfLines={1}>
            {categoryLabel(category, tr)}
          </Text>
          <Text style={[styles.limit, { color: theme.colors.textMuted }]} numberOfLines={1}>
            {fmtAmount(spent)} / {fmtAmount(limit)} {currency} ·{' '}
            {rest >= 0 ? tr.money.budgetLeft(fmtAmount(rest)) : tr.money.budgetOver(fmtAmount(-rest))}
          </Text>
        </View>
        <Text style={[styles.percent, { color: over ? theme.colors.danger : theme.colors.text }]}>{Math.round(ratio * 100)}%</Text>
      </PressableScale>

      {ask ? (
        <View style={styles.monthEnd}>
          <Text style={[styles.monthEndText, { color: theme.colors.textMuted }]}>
            {tr.money.budgetMonthQuestion(`${fmtAmount(limit)} ${currency}`)}
          </Text>
          <Pressable disabled={disabled} onPress={keep} hitSlop={6} style={[styles.chip, { backgroundColor: `${theme.colors.primary}1F` }]}>
            <Text style={[styles.chipText, { color: theme.colors.primary }]}>{tr.money.keep}</Text>
          </Pressable>
          <Pressable disabled={disabled} onPress={() => setSheet('limit')} hitSlop={6} style={[styles.chip, { backgroundColor: `${theme.colors.primary}1F` }]}>
            <Text style={[styles.chipText, { color: theme.colors.primary }]}>{tr.money.change}</Text>
          </Pressable>
        </View>
      ) : null}

      <BudgetSheet category={category} mode={sheet} askMonth={ask ? askMonth : null} onClose={() => setSheet(null)} />
    </View>
  );
}

function BudgetSheet({
  category,
  mode,
  askMonth,
  onClose,
}: {
  category: Category;
  mode: null | 'main' | 'limit';
  askMonth: string | null;
  onClose: () => void;
}) {
  const theme = useTheme();
  const tr = useTranslation();
  const currency = useSettingsStore((s) => s.settings.currency);
  const hasPassword = useSettingsStore((s) => !!s.settings.profilePasswordSet);
  const expenses = useFinanceStore((s) => s.expenses);
  const addExpense = useFinanceStore((s) => s.addExpense);
  const setCategoryBudget = useFinanceStore((s) => s.setCategoryBudget);

  const [step, setStep] = useState<'main' | 'limit' | 'password'>('main');
  const [amount, setAmount] = useState('');
  const [limit, setLimit] = useState('');
  const [password, setPassword] = useState('');
  const [wrong, setWrong] = useState(false);

  // Fresh every time it opens.
  const [wasMode, setWasMode] = useState(mode);
  if (mode !== wasMode) {
    setWasMode(mode);
    if (mode) {
      setStep(mode === 'limit' ? 'limit' : 'main');
      setAmount('');
      setLimit(amountDraft(category.limitMonth ?? 0));
      setPassword('');
      setWrong(false);
    }
  }

  const monthStart = toDateKey(startOfMonth(new Date()));
  const today = todayKey();
  const purchases = expenses.filter((e) => e.categoryId === category.id && e.date >= monthStart && e.date <= today).slice(0, 30);

  async function handleAdd() {
    const n = parse(amount);
    if (!n) return;
    haptics.tap();
    await addExpense({ amount: n, categoryId: category.id, date: todayKey(), comment: null });
    setAmount('');
  }

  async function applyLimit() {
    const n = parse(limit);
    if (!n) return;
    await setCategoryBudget(category.id, n);
    if (askMonth) {
      const { settings, updateSettings } = useSettingsStore.getState();
      updateSettings({ budgetMonthChoice: { ...settings.budgetMonthChoice, [category.id]: askMonth } });
    }
    haptics.success();
    onClose();
  }

  /** A new limit: the profile password if there is one, otherwise the phone's own lock. */
  async function submitLimit() {
    if (!parse(limit)) return;
    if (hasPassword) {
      setStep('password');
      return;
    }
    if (await deviceAuthAvailable()) {
      if (!(await confirmWithDevice(tr.plans.devicePrompt, tr.plans.cancel))) return;
    }
    await applyLimit();
  }

  async function checkPassword() {
    if (await checkProfilePassword(password)) {
      await applyLimit();
      return;
    }
    haptics.warning();
    setWrong(true);
  }

  function askRemove() {
    Alert.alert(tr.money.removeBudget, '', [
      { text: tr.money.cancel, style: 'cancel' },
      {
        text: tr.money.remove,
        style: 'destructive',
        onPress: async () => {
          onClose();
          await setCategoryBudget(category.id, null);
        },
      },
    ]);
  }

  let body: React.ReactNode;
  if (step === 'limit') {
    body = (
      <>
        <TextField label={tr.money.budgetLimit(currency)} value={limit} onChangeText={setLimit} keyboardType="decimal-pad" autoFocus />
        <View style={styles.buttons}>
          <Button title={tr.money.cancel} variant="secondary" onPress={mode === 'limit' ? onClose : () => setStep('main')} style={styles.flex} />
          <Button title={tr.money.save} onPress={submitLimit} style={styles.flex} />
        </View>
      </>
    );
  } else if (step === 'password') {
    body = (
      <>
        <TextField
          label={tr.plans.passwordLabel}
          value={password}
          onChangeText={(t) => {
            setPassword(t);
            setWrong(false);
          }}
          secureTextEntry
          autoFocus
        />
        {wrong ? <Text style={{ color: theme.colors.danger, fontSize: 13, fontWeight: '600' }}>{tr.plans.passwordWrong}</Text> : null}
        <View style={styles.buttons}>
          <Button title={tr.money.cancel} variant="secondary" onPress={() => setStep('limit')} style={styles.flex} />
          <Button title={tr.plans.confirm} onPress={checkPassword} style={styles.flex} />
        </View>
      </>
    );
  } else {
    body = (
      <>
        <View style={styles.addRow}>
          <View style={styles.flex}>
            <TextField label={`${tr.plans.spentLabel} (${currency})`} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0" />
          </View>
          <Button title={tr.plans.add} onPress={handleAdd} style={styles.addButton} />
        </View>
        <Text style={[styles.sectionLabel, { color: theme.colors.textMuted }]}>{tr.plans.history}</Text>
        {purchases.length === 0 ? <Text style={{ color: theme.colors.textMuted, fontSize: 13 }}>{tr.plans.noSpends}</Text> : null}
        {purchases.map((e) => (
          <View key={e.id} style={[styles.spendRow, { borderColor: theme.colors.border }]}>
            <Text style={[styles.spendDate, { color: theme.colors.textMuted }]}>
              {new Date(`${e.date}T12:00:00`).toLocaleDateString(tr.localeCode, { day: 'numeric', month: 'short' })}
            </Text>
            <Text style={[styles.spendAmount, { color: theme.colors.text }]} numberOfLines={1}>
              -{fmtAmount(e.amount)} {currency}
              {e.comment ? ` · ${e.comment}` : ''}
            </Text>
            <Pressable onPress={() => removeExpenseAsking(e.id)} hitSlop={8}>
              <Ionicons name="close" size={18} color={theme.colors.textMuted} />
            </Pressable>
          </View>
        ))}
        <View style={styles.buttons}>
          <Button title={tr.plans.changeLimit} variant="secondary" onPress={() => setStep('limit')} style={styles.flex} />
          <Button title={tr.money.remove} variant="danger" onPress={askRemove} style={styles.flex} />
        </View>
      </>
    );
  }

  return (
    <MoneyDialog visible={mode !== null} onClose={onClose} title={categoryLabel(category, tr)}>
      {body}
    </MoneyDialog>
  );
}

/** New category budget: pick a category without one and a monthly limit. */
export function BudgetFormDialog({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const tr = useTranslation();
  const currency = useSettingsStore((s) => s.settings.currency);
  const categories = useFinanceStore((s) => s.categories);
  const setCategoryBudget = useFinanceStore((s) => s.setCategoryBudget);
  const free = categories.filter((c) => !c.limitMonth);
  const [categoryId, setCategoryId] = useState('');
  const [limit, setLimit] = useState('');

  const [wasVisible, setWasVisible] = useState(visible);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) {
      setCategoryId(free[0]?.id ?? '');
      setLimit('');
    }
  }

  async function save() {
    const n = parse(limit);
    if (!n || !categoryId) return;
    await setCategoryBudget(categoryId, n);
    haptics.success();
    onClose();
  }

  return (
    <MoneyDialog visible={visible} onClose={onClose} title={tr.money.newBudget} hint={tr.money.budgetsEmpty}>
      <CategoryPicker categories={free} value={categoryId} onChange={setCategoryId} />
      <TextField label={tr.money.budgetLimit(currency)} value={limit} onChangeText={setLimit} keyboardType="decimal-pad" placeholder="0" />
      <View style={styles.buttons}>
        <Button title={tr.money.cancel} variant="secondary" onPress={onClose} style={styles.flex} />
        <Button title={tr.money.save} onPress={save} style={styles.flex} />
      </View>
    </MoneyDialog>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  wrap: { gap: 8 },
  bar: { height: BAR_HEIGHT, overflow: 'hidden', borderWidth: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 12 },
  left: { flex: 1, gap: 2 },
  name: { fontSize: 16, fontWeight: '700' },
  limit: { fontSize: 12, fontWeight: '600', fontVariant: ['tabular-nums'] },
  percent: { fontSize: 22, fontWeight: '800', fontVariant: ['tabular-nums'] },
  monthEnd: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  monthEndText: { fontSize: 12, fontWeight: '600', flexGrow: 1 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14 },
  chipText: { fontSize: 13, fontWeight: '700' },
  addRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  addButton: { paddingHorizontal: 18 },
  sectionLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  spendRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  spendDate: { fontSize: 13, width: 64 },
  spendAmount: { flex: 1, fontSize: 15, fontWeight: '700' },
  buttons: { flexDirection: 'row', gap: 10 },
});
