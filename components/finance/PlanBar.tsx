import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import Animated, { Easing, useAnimatedProps, useSharedValue, withRepeat, withTiming, type SharedValue } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { useFinanceStore } from '@/store/useFinanceStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { confirmWithDevice, deviceAuthAvailable } from '@/store/useFinanceLock';
import { checkProfilePassword } from '@/lib/password';
import { currentSpends, needsMonthEndChoice, planRatio, spentInPeriod } from '@/lib/plans';
import { haptics } from '@/lib/haptics';
import { Button, PressableScale, Text, TextField, useKeyboardHeight } from '@/components/ui';
import { useTranslation } from '@/i18n';
import { SpendPlan } from '@/types';

const AnimatedPath = Animated.createAnimatedComponent(Path);

const BAR_HEIGHT = 68;
/** How far the wave's crest swings left and right of the fill line, in points. */
const AMPLITUDE = 5;
/** Two full waves over the bar's height. */
const WAVES = 2;
const FILL = { duration: 900, easing: Easing.inOut(Easing.cubic) };

/**
 * The filled part of the bar, its right edge a wave that keeps rolling. `fill` is 0–1 of the
 * width; `phase` rolls the wave along.
 */
function Wave({ width, fill, phase, offset, color, opacity }: {
  width: number;
  fill: SharedValue<number>;
  phase: SharedValue<number>;
  offset: number;
  color: string;
  opacity: number;
}) {
  const props = useAnimatedProps(() => {
    const edge = fill.value * width;
    // The wave flattens out near 0 % and 100 % so the bar doesn't bulge past its ends.
    const amplitude = Math.min(AMPLITUDE, edge / 2, (width - edge) / 2);
    if (edge <= 0.5) return { d: 'M 0 0' };
    let d = `M 0 0 L ${edge + amplitude * Math.sin(phase.value + offset)} 0`;
    for (let y = 4; y <= BAR_HEIGHT; y += 4) {
      const x = edge + amplitude * Math.sin((y / BAR_HEIGHT) * WAVES * 2 * Math.PI + phase.value + offset);
      d += ` L ${x} ${y}`;
    }
    return { d: `${d} L 0 ${BAR_HEIGHT} Z` };
  });
  return <AnimatedPath animatedProps={props} fill={color} fillOpacity={opacity} />;
}

/**
 * A planned-spending bar in Finance: name and limit on the left, how much of it is used on the
 * right, filled from the left by a rolling wave in the theme colour. Past 100 % it turns red.
 * Tapping it opens the plan (log a purchase, change the limit, delete).
 */
export function PlanBar({ plan, disabled = false }: { plan: SpendPlan; disabled?: boolean }) {
  const theme = useTheme();
  const tr = useTranslation();
  const currency = useSettingsStore((s) => s.settings.currency);
  const planSpends = useFinanceStore((s) => s.planSpends);
  const nextLimit = useSettingsStore((s) => s.settings.planNextLimits[plan.id]);
  const spent = useMemo(() => spentInPeriod(plan, planSpends), [plan, planSpends]);
  const ratio = planRatio(plan, spent);
  const over = ratio > 1;
  const percent = Math.round(ratio * 100);
  const [width, setWidth] = useState(0);
  const [sheet, setSheet] = useState<null | 'plan' | 'newBudget'>(null);

  const fill = useSharedValue(0);
  const phase = useSharedValue(0);
  useEffect(() => {
    fill.value = withTiming(Math.min(1, ratio), FILL);
  }, [ratio, fill]);
  useEffect(() => {
    phase.value = withRepeat(withTiming(2 * Math.PI, { duration: 2600, easing: Easing.linear }), -1, false);
  }, [phase]);

  const fillColor = over ? theme.colors.danger : theme.colors.primary;
  // Barely-there grey: a see-through tint of the text colour, so it works on any background.
  const empty = theme.dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)';

  return (
    <View style={styles.wrap}>
      <PressableScale
        disabled={disabled}
        onPress={() => setSheet('plan')}
        scaleTo={0.98}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        style={[
          styles.bar,
          { backgroundColor: empty, borderRadius: theme.design.radius.card, borderColor: over ? theme.colors.danger : 'transparent' },
        ]}
      >
        {width > 0 ? (
          <Svg width={width} height={BAR_HEIGHT} style={StyleSheet.absoluteFill}>
            <Wave width={width} fill={fill} phase={phase} offset={0} color={fillColor} opacity={0.55} />
          </Svg>
        ) : null}
        <View style={styles.left}>
          <Text style={[styles.name, { color: theme.colors.text }]} numberOfLines={1}>
            {plan.name}
          </Text>
          <Text style={[styles.limit, { color: theme.colors.textMuted }]} numberOfLines={1}>
            {spent.toFixed(0)} / {plan.limit.toFixed(0)} {currency}
          </Text>
        </View>
        <Text style={[styles.percent, { color: over ? theme.colors.danger : theme.colors.text }]}>{percent}%</Text>
      </PressableScale>

      {needsMonthEndChoice(plan) ? (
        // The plan starts over by itself on the 1st; here the next month's limit can be changed.
        <View style={styles.monthEnd}>
          <Text style={[styles.monthEndText, { color: theme.colors.textMuted }]}>
            {tr.plans.monthEnd}
            {nextLimit ? ` · ${tr.plans.nextLimit(`${nextLimit.toFixed(0)} ${currency}`)}` : ''}
          </Text>
          <Pressable disabled={disabled} onPress={() => setSheet('newBudget')} hitSlop={6} style={[styles.chip, { backgroundColor: `${theme.colors.primary}1F` }]}>
            <Text style={[styles.chipText, { color: theme.colors.primary }]}>{tr.plans.changeBudget}</Text>
          </Pressable>
        </View>
      ) : null}

      {plan.period > 0 && daysSince(plan.periodStart) < 3 ? (
        <Text style={[styles.monthEndText, { color: theme.colors.textMuted }]}>{tr.plans.newPeriod}</Text>
      ) : null}

      <PlanSheet plan={plan} mode={sheet} onClose={() => setSheet(null)} />
    </View>
  );
}

/**
 * The plan opened from its bar. 'plan': log a purchase, see this period's purchases, change the
 * limit or delete. 'newBudget': the month-end "change budget" — the limit for next month's plan.
 * A new limit is asked to be confirmed, then checked with the profile password (or the phone's
 * fingerprint/PIN when there's no password).
 */
function PlanSheet({ plan, mode, onClose }: { plan: SpendPlan; mode: null | 'plan' | 'newBudget'; onClose: () => void }) {
  const theme = useTheme();
  const tr = useTranslation();
  const insets = useSafeAreaInsets();
  const keyboardHeight = useKeyboardHeight();
  const currency = useSettingsStore((s) => s.settings.currency);
  const hasPassword = useSettingsStore((s) => !!s.settings.profilePasswordSet);
  const planSpends = useFinanceStore((s) => s.planSpends);
  const addPlanSpend = useFinanceStore((s) => s.addPlanSpend);
  const removePlanSpend = useFinanceStore((s) => s.removePlanSpend);
  const updateSpendPlan = useFinanceStore((s) => s.updateSpendPlan);
  const deleteSpendPlan = useFinanceStore((s) => s.deleteSpendPlan);

  // 'limit' = typing the new limit, 'password' = checking it's really you.
  const [step, setStep] = useState<'main' | 'limit' | 'password'>('main');
  const [amount, setAmount] = useState('');
  const [limit, setLimit] = useState('');
  const [password, setPassword] = useState('');
  const [wrongPassword, setWrongPassword] = useState(false);

  const spends = currentSpends(plan, planSpends);
  const parse = (text: string) => {
    const n = parseFloat(text.replace(',', '.'));
    return Number.isFinite(n) && n > 0 ? n : null;
  };

  function handleShow() {
    setStep(mode === 'newBudget' ? 'limit' : 'main');
    setAmount('');
    setLimit(plan.limit.toFixed(0));
    setPassword('');
    setWrongPassword(false);
  }

  function close() {
    setStep('main');
    onClose();
  }

  async function handleAdd() {
    const n = parse(amount);
    if (!n) return;
    haptics.tap();
    await addPlanSpend(plan.id, n);
    setAmount('');
  }

  function askChangeLimit() {
    Alert.alert(tr.plans.confirmChangeTitle, tr.plans.confirmChangeText, [
      { text: tr.plans.cancel, style: 'cancel' },
      { text: tr.plans.confirmYes, onPress: () => setStep('limit') },
    ]);
  }

  async function applyLimit() {
    const n = parse(limit);
    if (!n) return;
    haptics.success();
    if (mode === 'newBudget') {
      // Month end: the new limit starts with next month's plan (on the 1st).
      const { settings, updateSettings } = useSettingsStore.getState();
      updateSettings({ planNextLimits: { ...settings.planNextLimits, [plan.id]: n } });
    } else await updateSpendPlan(plan.id, { limit: n });
    close();
  }

  /** After the new limit is typed: password if the profile has one, otherwise the phone's lock. */
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
    setWrongPassword(true);
  }

  function askDelete() {
    Alert.alert(tr.plans.removeTitle, tr.plans.removeText, [
      { text: tr.plans.cancel, style: 'cancel' },
      {
        text: tr.plans.remove,
        style: 'destructive',
        onPress: async () => {
          close();
          await deleteSpendPlan(plan.id);
        },
      },
    ]);
  }

  let body: React.ReactNode;
  if (step === 'limit') {
    body = (
      <>
        <TextField
          label={`${mode === 'newBudget' ? tr.plans.newLimit : tr.plans.limitLabel} (${currency})`}
          value={limit}
          onChangeText={setLimit}
          keyboardType="decimal-pad"
          autoFocus
        />
        <View style={styles.buttons}>
          <Button title={tr.plans.cancel} variant="secondary" onPress={mode === 'newBudget' ? close : () => setStep('main')} style={styles.flex} />
          <Button title={tr.plans.save} onPress={submitLimit} style={styles.flex} />
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
            setWrongPassword(false);
          }}
          secureTextEntry
          autoFocus
        />
        {wrongPassword ? <Text style={[styles.error, { color: theme.colors.danger }]}>{tr.plans.passwordWrong}</Text> : null}
        <View style={styles.buttons}>
          <Button title={tr.plans.cancel} variant="secondary" onPress={() => setStep('limit')} style={styles.flex} />
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
        <ScrollView style={styles.history} contentContainerStyle={styles.historyContent}>
          {spends.length === 0 ? <Text style={{ color: theme.colors.textMuted, fontSize: 13 }}>{tr.plans.noSpends}</Text> : null}
          {spends.map((s) => (
            <View key={s.id} style={[styles.spendRow, { borderColor: theme.colors.border }]}>
              <Text style={[styles.spendDate, { color: theme.colors.textMuted }]}>
                {new Date(`${s.date}T12:00:00`).toLocaleDateString(tr.localeCode, { day: 'numeric', month: 'short' })}
              </Text>
              <Text style={[styles.spendAmount, { color: theme.colors.text }]}>
                -{s.amount.toFixed(0)} {currency}
              </Text>
              <Pressable onPress={() => removePlanSpend(s.id)} hitSlop={8}>
                <Ionicons name="close" size={18} color={theme.colors.textMuted} />
              </Pressable>
            </View>
          ))}
        </ScrollView>
        <View style={styles.buttons}>
          <Button title={tr.plans.changeLimit} variant="secondary" onPress={askChangeLimit} style={styles.flex} />
          <Button title={tr.plans.remove} variant="danger" onPress={askDelete} style={styles.flex} />
        </View>
      </>
    );
  }

  return (
    <Modal visible={mode !== null} transparent animationType="slide" onShow={handleShow} onRequestClose={close}>
      <View style={[styles.backdrop, { paddingBottom: keyboardHeight }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} />
        <View
          style={[
            styles.sheet,
            { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, paddingBottom: (keyboardHeight ? 0 : insets.bottom) + 20 },
          ]}
        >
          <Text style={[styles.sheetTitle, { color: theme.colors.text }]}>{plan.name}</Text>
          {body}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  wrap: { gap: 8 },
  bar: {
    height: BAR_HEIGHT,
    overflow: 'hidden',
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 12,
  },
  left: { flex: 1, gap: 2 },
  name: { fontSize: 16, fontWeight: '700' },
  limit: { fontSize: 12, fontWeight: '600', fontVariant: ['tabular-nums'] },
  percent: { fontSize: 22, fontWeight: '800', fontVariant: ['tabular-nums'] },
  monthEnd: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  monthEndText: { fontSize: 12, fontWeight: '600', flexGrow: 1 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14 },
  chipText: { fontSize: 13, fontWeight: '700' },
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, padding: 20, gap: 12 },
  sheetTitle: { fontSize: 18, fontWeight: '800' },
  addRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  addButton: { paddingHorizontal: 18 },
  sectionLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  history: { maxHeight: 220 },
  historyContent: { gap: 6 },
  spendRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  spendDate: { fontSize: 13, width: 64 },
  spendAmount: { flex: 1, fontSize: 15, fontWeight: '700' },
  buttons: { flexDirection: 'row', gap: 10 },
  error: { fontSize: 13, fontWeight: '600' },
});

function daysSince(dateKey: string): number {
  return (Date.now() - new Date(`${dateKey}T00:00:00`).getTime()) / 86_400_000;
}
