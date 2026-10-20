import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import Svg from 'react-native-svg';
import { Easing, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { Text } from '@/components/ui/Text';
import { Button, CustomizableCard, PressableScale, TextField } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';
import { useFinanceStore } from '@/store/useFinanceStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { accountBalance, accountName, MAIN_ACCOUNT_ID } from '@/lib/accounts';
import { todayKey } from '@/lib/dateRanges';
import { haptics } from '@/lib/haptics';
import { useTranslation } from '@/i18n';
import { Account, AccountKind } from '@/types';
import { AccountPicker, NO_ACCOUNT_ID, useAccountOptions } from './AccountPicker';
import { MoneyDialog } from './MoneyDialog';
import { BAR_HEIGHT, FILL, Wave } from './PlanBar';

const parseAmount = (text: string) => parseFloat(text.replace(',', '.'));

const ICONS: Record<AccountKind, string> = { card: '💳', cash: '💵', stash: '🫙', goal: '🎯' };

/**
 * A card, cash wallet, stash or goal on the Finance board. Tap → change the amount, transfer (or
 * put aside, for a goal), rename, remove. A goal is drawn as a bar filling up with a wave.
 */
export function AccountCard({ account, compact, disabled }: { account: Account; compact: boolean; disabled: boolean }) {
  const theme = useTheme();
  const tr = useTranslation();
  const expenses = useFinanceStore((s) => s.expenses);
  const transfers = useFinanceStore((s) => s.transfers);
  const setAccountBalance = useFinanceStore((s) => s.setAccountBalance);
  const updateAccount = useFinanceStore((s) => s.updateAccount);
  const removeAccount = useFinanceStore((s) => s.removeAccount);
  const removeTransfer = useFinanceStore((s) => s.removeTransfer);
  const settings = useSettingsStore((s) => s.settings);
  const options = useAccountOptions();
  const today = todayKey();
  const { balance, spentSinceSet } = useMemo(
    () => accountBalance(account, expenses, transfers, settings, today),
    [account, expenses, transfers, settings, today]
  );
  const [step, setStep] = useState<null | 'menu' | 'balance' | 'target' | 'edit' | 'transfer'>(null);
  const [draft, setDraft] = useState('');

  const isGoal = account.kind === 'goal';
  const isStash = account.kind === 'stash';
  const name = accountName(account, tr.accounts);
  const own = transfers.filter((t) => t.fromId === account.id || t.toId === account.id).slice(0, 20);
  const labelOf = (id: string) => (id === NO_ACCOUNT_ID ? tr.accounts.noSource : options.find((o) => o.id === id)?.label ?? '—');
  const money = (n: number, currency = account.currency) => `${n.toFixed(0)} ${currency}`;
  const close = () => setStep(null);

  function saveNumber(apply: (n: number) => void) {
    const n = parseAmount(draft);
    if (!Number.isFinite(n) || n < 0) return;
    apply(n);
    haptics.success();
    close();
  }

  function openNumber(next: 'balance' | 'target', value: number) {
    setDraft(value.toFixed(0));
    setStep(next);
  }

  function confirmRemove() {
    Alert.alert(tr.accounts.removeTitle, tr.accounts.removeText, [
      { text: tr.accounts.cancel, style: 'cancel' },
      {
        text: tr.accounts.remove,
        style: 'destructive',
        onPress: () => {
          close();
          removeAccount(account.id);
        },
      },
    ]);
  }

  const balanceTitle = isGoal
    ? tr.accounts.goalSaved(account.currency)
    : isStash
      ? tr.accounts.stashBalanceTitle(account.currency)
      : account.kind === 'cash'
        ? tr.accounts.cashBalanceTitle(account.currency)
        : tr.accounts.cardBalanceTitle(account.currency);

  // One root view holding the dialogs too (like PlanBar) — the board drags the whole item.
  return (
    <View>
      {isGoal ? (
        <GoalBar account={account} saved={balance} disabled={disabled} onPress={() => setStep('menu')} />
      ) : (
        <Pressable onPress={() => setStep('menu')} disabled={disabled}>
          <CustomizableCard widgetId={`account-${account.id}`} style={styles.card}>
            <Text style={[styles.header, { color: theme.colors.textMuted }]} numberOfLines={1}>
              {ICONS[account.kind]} {name}
            </Text>
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              style={[
                compact ? styles.amountSmall : styles.amount,
                { color: isStash ? theme.colors.text : balance >= 0 ? theme.colors.success : theme.colors.danger },
              ]}
            >
              {money(balance)}
            </Text>
            {spentSinceSet > 0 ? (
              <Text style={[styles.subline, { color: theme.colors.textMuted }]}>
                {tr.accounts.spent}: {spentSinceSet.toFixed(0)}
              </Text>
            ) : null}
          </CustomizableCard>
        </Pressable>
      )}

      <MoneyDialog
        visible={step === 'menu'}
        onClose={close}
        title={isGoal ? `${name} · ${money(balance)} / ${money(account.target ?? 0)}` : `${name} · ${money(balance)}`}
        hint={isStash ? tr.accounts.stashHint : undefined}
      >
        {isGoal ? <Button title={tr.accounts.putAside} onPress={() => setStep('transfer')} /> : null}
        <Button title={tr.accounts.setBalance} variant={isGoal ? 'secondary' : 'primary'} onPress={() => openNumber('balance', balance)} />
        {isGoal ? <Button title={tr.accounts.changeTarget} variant="secondary" onPress={() => openNumber('target', account.target ?? 0)} /> : null}
        {isGoal || isStash ? null : <Button title={tr.accounts.transfer} variant="secondary" onPress={() => setStep('transfer')} />}
        <Button title={tr.accounts.edit} variant="secondary" onPress={() => setStep('edit')} />
        {isStash ? null : (
          <>
            <Text style={[styles.section, { color: theme.colors.textMuted }]}>{tr.accounts.history}</Text>
            {own.length === 0 ? <Text style={{ color: theme.colors.textMuted, fontSize: 13 }}>{tr.accounts.noTransfers}</Text> : null}
            {own.map((t) => {
              const incoming = t.toId === account.id;
              return (
                <View key={t.id} style={[styles.transferRow, { borderColor: theme.colors.border }]}>
                  <Text style={[styles.transferText, { color: theme.colors.text }]} numberOfLines={1}>
                    {incoming ? `+${money(t.amountTo)} ← ${labelOf(t.fromId)}` : `-${money(t.amount)} → ${labelOf(t.toId)}`}
                  </Text>
                  <Pressable onPress={() => removeTransfer(t.id)} hitSlop={8}>
                    <Text style={{ color: theme.colors.textMuted, fontSize: 16 }}>✕</Text>
                  </Pressable>
                </View>
              );
            })}
          </>
        )}
        <Button title={tr.accounts.remove} variant="danger" onPress={confirmRemove} />
      </MoneyDialog>

      <MoneyDialog
        visible={step === 'balance'}
        onClose={close}
        title={balanceTitle}
        hint={isStash || isGoal ? undefined : tr.accounts.balanceHint}
      >
        <TextField value={draft} onChangeText={setDraft} keyboardType="decimal-pad" autoFocus />
        <View style={styles.buttons}>
          <Button title={tr.accounts.cancel} variant="secondary" onPress={close} style={styles.flex} />
          <Button title={tr.accounts.save} onPress={() => saveNumber((n) => setAccountBalance(account.id, n))} style={styles.flex} />
        </View>
      </MoneyDialog>

      <MoneyDialog visible={step === 'target'} onClose={close} title={tr.accounts.goalTarget(account.currency)}>
        <TextField value={draft} onChangeText={setDraft} keyboardType="decimal-pad" autoFocus />
        <View style={styles.buttons}>
          <Button title={tr.accounts.cancel} variant="secondary" onPress={close} style={styles.flex} />
          <Button title={tr.accounts.save} onPress={() => saveNumber((n) => updateAccount({ ...account, target: n }))} style={styles.flex} />
        </View>
      </MoneyDialog>

      <AccountFormDialog visible={step === 'edit'} kind={account.kind} account={account} onClose={close} />
      {isStash ? null : (
        <TransferDialog
          visible={step === 'transfer'}
          onClose={close}
          // Cash and goals are usually filled from the main card; a card usually sends to it.
          initialFrom={account.kind === 'card' ? account.id : MAIN_ACCOUNT_ID}
          initialTo={account.kind === 'card' ? MAIN_ACCOUNT_ID : account.id}
          fixedTo={isGoal ? account : undefined}
        />
      )}
    </View>
  );
}

/** A goal: name and "saved / target" on the left, percent on the right, filled by a rolling wave. */
function GoalBar({ account, saved, disabled, onPress }: { account: Account; saved: number; disabled: boolean; onPress: () => void }) {
  const theme = useTheme();
  const tr = useTranslation();
  const target = account.target ?? 0;
  const ratio = target > 0 ? Math.max(0, saved / target) : 0;
  const reached = target > 0 && saved >= target;
  const [width, setWidth] = useState(0);

  const fill = useSharedValue(0);
  const phase = useSharedValue(0);
  useEffect(() => {
    fill.value = withTiming(Math.min(1, ratio), FILL);
  }, [ratio, fill]);
  useEffect(() => {
    phase.value = withRepeat(withTiming(2 * Math.PI, { duration: 2600, easing: Easing.linear }), -1, false);
  }, [phase]);

  // Reaching the goal: one happy buzz the moment it happens (not on every open).
  const [wasReached, setWasReached] = useState(reached);
  if (reached !== wasReached) {
    setWasReached(reached);
    if (reached) haptics.success();
  }

  const color = reached ? theme.colors.success : theme.colors.primary;
  const empty = theme.dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)';
  return (
    <View style={styles.goalWrap}>
      <PressableScale
        disabled={disabled}
        onPress={onPress}
        scaleTo={0.98}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        style={[styles.goalBar, { backgroundColor: empty, borderRadius: theme.design.radius.card }]}
      >
        {width > 0 ? (
          <Svg width={width} height={BAR_HEIGHT} style={StyleSheet.absoluteFill}>
            <Wave width={width} fill={fill} phase={phase} offset={0} color={color} opacity={0.55} />
          </Svg>
        ) : null}
        <View style={styles.goalLeft}>
          <Text style={[styles.goalName, { color: theme.colors.text }]} numberOfLines={1}>
            🎯 {accountName(account, tr.accounts)}
          </Text>
          <Text style={[styles.goalAmount, { color: theme.colors.textMuted }]} numberOfLines={1}>
            {saved.toFixed(0)} / {target.toFixed(0)} {account.currency}
          </Text>
        </View>
        <Text style={[styles.goalPercent, { color: theme.colors.text }]}>{Math.round(ratio * 100)}%</Text>
      </PressableScale>
      {reached ? <Text style={[styles.reached, { color: theme.colors.success }]}>{tr.accounts.goalReached}</Text> : null}
    </View>
  );
}

/** New card / cash wallet / stash / goal (no `account`), or its name and currency (with `account`). */
export function AccountFormDialog({
  visible,
  kind,
  account,
  onClose,
}: {
  visible: boolean;
  kind: AccountKind;
  account?: Account;
  onClose: () => void;
}) {
  const tr = useTranslation();
  const appCurrency = useSettingsStore((s) => s.settings.currency);
  const addAccount = useFinanceStore((s) => s.addAccount);
  const updateAccount = useFinanceStore((s) => s.updateAccount);
  const [name, setName] = useState(account?.name ?? '');
  const [currency, setCurrency] = useState(account?.currency ?? appCurrency);
  const [balance, setBalance] = useState('');
  const [target, setTarget] = useState('');

  // Fresh fields every time it opens.
  const [wasVisible, setWasVisible] = useState(visible);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) {
      setName(account?.name ?? '');
      setCurrency(account?.currency ?? appCurrency);
      setBalance('');
      setTarget('');
    }
  }

  const cur = currency.trim() || appCurrency;
  async function save() {
    if (account) {
      await updateAccount({ ...account, name: name.trim(), currency: cur });
    } else {
      const n = parseAmount(balance);
      const t = parseAmount(target);
      if (kind === 'goal' && !(t > 0)) return;
      await addAccount({ kind, name, currency: cur, balance: Number.isFinite(n) ? n : 0, target: kind === 'goal' ? t : null });
    }
    haptics.success();
    onClose();
  }

  const labels: Record<AccountKind, { title: string; name: string; placeholder: string; balance: string }> = {
    card: { title: tr.accounts.addCard, name: tr.accounts.bankName, placeholder: tr.accounts.bankNamePlaceholder, balance: tr.accounts.cardBalanceTitle(cur) },
    cash: { title: tr.accounts.addCash, name: tr.accounts.cashName, placeholder: tr.accounts.cashNamePlaceholder, balance: tr.accounts.cashBalanceTitle(cur) },
    stash: { title: tr.accounts.addStash, name: tr.accounts.cashName, placeholder: tr.accounts.stashNamePlaceholder, balance: tr.accounts.stashBalanceTitle(cur) },
    goal: { title: tr.accounts.addGoal, name: tr.accounts.goalName, placeholder: tr.accounts.goalNamePlaceholder, balance: tr.accounts.goalSaved(cur) },
  };
  const l = labels[kind];
  return (
    <MoneyDialog visible={visible} onClose={onClose} title={account ? tr.accounts.edit : l.title} hint={!account && kind === 'stash' ? tr.accounts.stashHint : undefined}>
      <TextField label={l.name} value={name} onChangeText={setName} placeholder={l.placeholder} />
      <TextField label={tr.accounts.currency} value={currency} onChangeText={setCurrency} placeholder="zł, €, $" autoCapitalize="none" />
      {!account && kind === 'goal' ? (
        <TextField label={tr.accounts.goalTarget(cur)} value={target} onChangeText={setTarget} keyboardType="decimal-pad" placeholder="0" />
      ) : null}
      {account ? null : <TextField label={l.balance} value={balance} onChangeText={setBalance} keyboardType="decimal-pad" placeholder="0" />}
      <View style={styles.buttons}>
        <Button title={tr.accounts.cancel} variant="secondary" onPress={onClose} style={styles.flex} />
        <Button title={account ? tr.accounts.save : tr.accounts.create} onPress={save} style={styles.flex} />
      </View>
    </MoneyDialog>
  );
}

/**
 * Money from one card or wallet to another; asks what arrived when the currencies differ. With
 * `fixedTo` (a goal) only the source is picked — or "just count it", taking nothing off a card.
 */
export function TransferDialog({
  visible,
  onClose,
  initialFrom,
  initialTo,
  fixedTo,
}: {
  visible: boolean;
  onClose: () => void;
  initialFrom: string;
  initialTo: string;
  fixedTo?: Account;
}) {
  const tr = useTranslation();
  const addTransfer = useFinanceStore((s) => s.addTransfer);
  const options = useAccountOptions();
  const [fromId, setFromId] = useState(initialFrom);
  const [toId, setToId] = useState(initialTo);
  const [amount, setAmount] = useState('');
  const [received, setReceived] = useState('');

  const [wasVisible, setWasVisible] = useState(visible);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) {
      setFromId(initialFrom);
      setToId(initialTo);
      setAmount('');
      setReceived('');
    }
  }

  const to = fixedTo ? { id: fixedTo.id, currency: fixedTo.currency } : options.find((o) => o.id === toId);
  const counterOnly = fromId === NO_ACCOUNT_ID;
  const from = counterOnly ? to : options.find((o) => o.id === fromId);
  const sameCurrency = !from || !to || from.currency === to.currency;
  const noneOption = fixedTo ? [{ id: NO_ACCOUNT_ID, label: tr.accounts.noSource, currency: fixedTo.currency }] : [];

  async function save() {
    const sent = parseAmount(amount);
    const got = sameCurrency ? sent : parseAmount(received);
    const target = to?.id ?? toId;
    if (!(sent > 0) || !(got > 0) || fromId === target) return;
    await addTransfer({ fromId, toId: target, amount: sent, amountTo: got, date: todayKey() });
    haptics.success();
    onClose();
  }

  return (
    <MoneyDialog visible={visible} onClose={onClose} title={fixedTo ? tr.accounts.putAside : tr.accounts.transfer}>
      <AccountPicker label={tr.accounts.transferFrom} value={fromId} onChange={setFromId} extra={noneOption} />
      {fixedTo ? null : <AccountPicker label={tr.accounts.transferTo} value={toId} onChange={setToId} exclude={[fromId]} />}
      <TextField label={tr.accounts.amountSent(from?.currency ?? '')} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0" />
      {sameCurrency ? null : (
        <TextField
          label={tr.accounts.amountReceived(to?.currency ?? '')}
          value={received}
          onChangeText={setReceived}
          keyboardType="decimal-pad"
          placeholder="0"
        />
      )}
      <View style={styles.buttons}>
        <Button title={tr.accounts.cancel} variant="secondary" onPress={onClose} style={styles.flex} />
        <Button title={fixedTo ? tr.accounts.putAside : tr.accounts.transfer} onPress={save} style={styles.flex} />
      </View>
    </MoneyDialog>
  );
}

const styles = StyleSheet.create({
  card: { gap: 4 },
  header: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 },
  amount: { fontSize: 24, fontWeight: '800' },
  amountSmall: { fontSize: 20, fontWeight: '800' },
  subline: { fontSize: 11 },
  section: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', marginTop: 4 },
  transferRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6, borderBottomWidth: StyleSheet.hairlineWidth },
  transferText: { flex: 1, fontSize: 13 },
  buttons: { flexDirection: 'row', gap: 10 },
  flex: { flex: 1 },
  goalWrap: { gap: 6 },
  goalBar: { height: BAR_HEIGHT, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 },
  goalLeft: { flex: 1, gap: 2 },
  goalName: { fontSize: 15, fontWeight: '700' },
  goalAmount: { fontSize: 12, fontWeight: '600' },
  goalPercent: { fontSize: 20, fontWeight: '800' },
  reached: { fontSize: 13, fontWeight: '700', textAlign: 'center' },
});
