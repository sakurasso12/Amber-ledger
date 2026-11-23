import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { Button, Chip, Screen, SubScreenHeader, TextField } from '@/components/ui';
import { MoneyDialog } from '@/components/finance/MoneyDialog';
import { AccountPicker } from '@/components/finance/AccountPicker';
import { useTheme } from '@/theme/ThemeProvider';
import { cardSurface } from '@/theme/surfaces';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useFinanceStore } from '@/store/useFinanceStore';
import { accountName, primaryId } from '@/lib/accounts';
import { fmtAmount } from '@/lib/money';
import { generateId } from '@/lib/id';
import { todayKey } from '@/lib/dateRanges';
import { haptics } from '@/lib/haptics';
import { useTranslation } from '@/i18n';
import { IncomeSource } from '@/types/settings';

type Kind = IncomeSource['kind'];
const KIND_ICON: Record<Kind | 'hourly', keyof typeof Ionicons.glyphMap> = {
  pension: 'heart-outline',
  fixed: 'wallet-outline',
  hourly: 'calendar-outline',
  other: 'add-circle-outline',
};

const parse = (t: string) => {
  const n = parseFloat(t.replace(',', '.').replace(/\s/g, ''));
  return Number.isFinite(n) ? n : NaN;
};
const clampDay = (t: string) => Math.min(31, Math.max(1, parseInt(t, 10) || 1));

/**
 * "Мої доходи" (1.8): pensions, a fixed salary and other regular money, each with its amount, day
 * and the card or cash it goes to. Hourly pay stays where it was (Finance → Earnings, work shifts);
 * the "Hourly" choice here just points there.
 */
export function IncomesSettingsScreen() {
  const theme = useTheme();
  const tr = useTranslation();
  const t = tr.incomes;
  const insets = useSafeAreaInsets();
  const sources = useSettingsStore((s) => s.settings.incomeSources) ?? [];
  const currency = useSettingsStore((s) => s.settings.currency);
  const updateSettings = useSettingsStore((s) => s.updateSettings);
  const accounts = useFinanceStore((s) => s.accounts);
  const [editing, setEditing] = useState<IncomeSource | null>(null);
  const [picking, setPicking] = useState(false);

  const accountLabel = (id: string) => {
    const a = accounts.find((x) => x.id === id) ?? accounts.find((x) => x.id === primaryId(accounts));
    return a ? accountName(a, tr.accounts) : '';
  };

  function startNew(kind: Kind) {
    setPicking(false);
    setEditing({
      id: '',
      name: '',
      kind,
      amount: 0,
      payDay: 10,
      advance: null,
      accountId: primaryId(accounts),
      since: todayKey(),
    });
  }

  function save(source: IncomeSource) {
    const list = source.id ? sources.map((s) => (s.id === source.id ? source : s)) : [...sources, { ...source, id: generateId() }];
    updateSettings({ incomeSources: list });
    haptics.success();
    setEditing(null);
  }

  function remove(source: IncomeSource) {
    Alert.alert(t.removeTitle, t.removeText, [
      { text: t.cancel, style: 'cancel' },
      {
        text: t.remove,
        style: 'destructive',
        onPress: () => {
          updateSettings({ incomeSources: sources.filter((s) => s.id !== source.id) });
          setEditing(null);
        },
      },
    ]);
  }

  return (
    <Screen style={{ paddingTop: insets.top }}>
      <SubScreenHeader title={t.title} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.hint, { color: theme.colors.textMuted }]}>{t.hint}</Text>

        {sources.length === 0 ? <Text style={[styles.empty, { color: theme.colors.textMuted }]}>{t.empty}</Text> : null}
        {sources.map((source) => (
          <Pressable key={source.id} onPress={() => setEditing(source)} style={[styles.row, cardSurface(theme)]}>
            <View style={[styles.icon, { backgroundColor: `${theme.colors.primary}22` }]}>
              <Ionicons name={KIND_ICON[source.kind]} size={22} color={theme.colors.primary} />
            </View>
            <View style={styles.flex}>
              <Text style={[styles.rowTitle, { color: theme.colors.text }]}>{source.name}</Text>
              <Text style={[styles.rowSub, { color: theme.colors.textMuted }]}>
                {t.monthly(source.payDay)} · {accountLabel(source.accountId)}
              </Text>
            </View>
            <Text style={[styles.rowAmount, { color: theme.colors.success }]}>
              {fmtAmount(source.amount)} {currency}
            </Text>
          </Pressable>
        ))}

        <Button title={`+ ${t.add}`} onPress={() => setPicking(true)} />
      </ScrollView>

      <MoneyDialog visible={picking} onClose={() => setPicking(false)} title={t.which}>
        {(['pension', 'fixed', 'hourly', 'other'] as const).map((kind) => (
          <Pressable
            key={kind}
            onPress={() => (kind === 'hourly' ? (setPicking(false), Alert.alert(t.kinds.hourly.title, t.hourlyHint)) : startNew(kind))}
            style={[styles.kind, { borderColor: theme.colors.border }]}
          >
            <Ionicons name={KIND_ICON[kind]} size={24} color={theme.colors.primary} />
            <View style={styles.flex}>
              <Text style={[styles.kindTitle, { color: theme.colors.text }]}>{t.kinds[kind].title}</Text>
              <Text style={[styles.kindDesc, { color: theme.colors.textMuted }]}>{t.kinds[kind].desc}</Text>
            </View>
          </Pressable>
        ))}
      </MoneyDialog>

      {editing ? <IncomeEditor source={editing} onSave={save} onRemove={remove} onClose={() => setEditing(null)} /> : null}
    </Screen>
  );
}

function IncomeEditor({
  source,
  onSave,
  onRemove,
  onClose,
}: {
  source: IncomeSource;
  onSave: (s: IncomeSource) => void;
  onRemove: (s: IncomeSource) => void;
  onClose: () => void;
}) {
  const tr = useTranslation();
  const t = tr.incomes;
  const currency = useSettingsStore((s) => s.settings.currency);
  const [name, setName] = useState(source.name);
  const [amount, setAmount] = useState(source.amount ? String(source.amount) : '');
  const [payDay, setPayDay] = useState(String(source.payDay));
  const [hasAdvance, setHasAdvance] = useState(!!source.advance);
  const [advanceDay, setAdvanceDay] = useState(String(source.advance?.day ?? 15));
  const [advanceAmount, setAdvanceAmount] = useState(source.advance ? String(source.advance.amount) : '');
  const [accountId, setAccountId] = useState(source.accountId);

  const total = parse(amount);
  const adv = parse(advanceAmount);
  const valid = total > 0 && (!hasAdvance || (adv > 0 && adv < total));

  function submit() {
    if (!valid) return;
    onSave({
      ...source,
      name: name.trim() || t.namePlaceholder[source.kind],
      amount: total,
      payDay: clampDay(payDay),
      advance: source.kind === 'fixed' && hasAdvance ? { day: clampDay(advanceDay), amount: adv } : null,
      accountId,
    });
  }

  return (
    <MoneyDialog visible onClose={onClose} title={t.kinds[source.kind].title}>
      <TextField label={t.name} value={name} onChangeText={setName} placeholder={t.namePlaceholder[source.kind]} />
      <TextField label={t.amount(currency)} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0" />
      <TextField label={t.payDay} value={payDay} onChangeText={setPayDay} keyboardType="number-pad" placeholder="10" />
      {source.kind === 'fixed' ? (
        <>
          <Chip label={t.advance} selected={hasAdvance} onPress={() => setHasAdvance((v) => !v)} />
          {hasAdvance ? (
            <>
              <TextField label={t.advanceDay} value={advanceDay} onChangeText={setAdvanceDay} keyboardType="number-pad" placeholder="15" />
              <TextField label={t.advanceAmount(currency)} value={advanceAmount} onChangeText={setAdvanceAmount} keyboardType="decimal-pad" placeholder="0" />
            </>
          ) : null}
        </>
      ) : null}
      <AccountPicker label={t.account} value={accountId} onChange={setAccountId} />
      <View style={styles.buttons}>
        <Button title={t.cancel} variant="secondary" onPress={onClose} style={styles.flex} />
        <Button title={t.save} onPress={submit} disabled={!valid} style={styles.flex} />
      </View>
      {source.id ? <Button title={t.remove} variant="danger" onPress={() => onRemove(source)} /> : null}
    </MoneyDialog>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingBottom: 32, gap: 12 },
  hint: { fontSize: 13, lineHeight: 19 },
  empty: { fontSize: 15, textAlign: 'center', paddingVertical: 20 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16, borderWidth: 1 },
  icon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontSize: 16, fontWeight: '700' },
  rowSub: { fontSize: 12, marginTop: 2 },
  rowAmount: { fontSize: 16, fontWeight: '800' },
  kind: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 14, borderWidth: 1 },
  kindTitle: { fontSize: 16, fontWeight: '700' },
  kindDesc: { fontSize: 12, marginTop: 2 },
  buttons: { flexDirection: 'row', gap: 8 },
  flex: { flex: 1 },
});
