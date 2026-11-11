import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { Button, TextField } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';
import { useFinanceStore } from '@/store/useFinanceStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useTranslation } from '@/i18n';
import { haptics } from '@/lib/haptics';
import { formatRangeLabel } from '@/lib/dateRanges';
import { accountName, primaryId } from '@/lib/accounts';
import { balanceOf } from '@/lib/ledger';
import { categoryLabel } from '@/lib/categoryLabel';
import { PendingItem, snoozeUntilTomorrow } from '@/lib/pending';
import { fmtAmount } from '@/lib/money';

const parse = (text: string) => {
  const n = parseFloat(text.replace(',', '.'));
  return Number.isFinite(n) && n >= 0 ? n : null;
};

interface AskCardProps {
  emoji: string;
  title: string;
  subtitle?: string;
  /** The amount offered by default (pre-filled when "other amount" opens). */
  amount: number;
  currency: string;
  yesLabel: string;
  onYes: () => void;
  onOther: (amount: number) => void;
  otherLabel: string;
  /** Extra buttons under the main ones ("not yet", "didn't happen", …). */
  extra: { label: string; onPress: () => void }[];
}

/** One question card: yes / other amount / the rest. */
function AskCard({ emoji, title, subtitle, amount, currency, yesLabel, onYes, onOther, otherLabel, extra }: AskCardProps) {
  const theme = useTheme();
  const tr = useTranslation();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  function saveOther() {
    const n = parse(draft);
    if (n === null) return;
    haptics.success();
    onOther(n);
    setEditing(false);
  }

  return (
    <View style={[styles.card, { backgroundColor: `${theme.colors.accent}1F`, borderColor: theme.colors.accent }]}>
      <Text style={[styles.title, { color: theme.colors.text }]}>
        {emoji} {title}
      </Text>
      {subtitle ? <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>{subtitle}</Text> : null}
      {editing ? (
        <View style={styles.editor}>
          <TextField label={tr.money.amountLabel(currency)} value={draft} onChangeText={setDraft} keyboardType="decimal-pad" autoFocus />
          <View style={styles.row}>
            <Button title={tr.money.cancel} variant="secondary" onPress={() => setEditing(false)} style={styles.button} />
            <Button title={tr.money.save} onPress={saveOther} style={styles.button} />
          </View>
        </View>
      ) : (
        <View style={styles.actions}>
          <View style={styles.row}>
            <Button
              title={yesLabel}
              onPress={() => {
                haptics.success();
                onYes();
              }}
              style={styles.button}
            />
            <Button
              title={otherLabel}
              variant="secondary"
              onPress={() => {
                setDraft(amount.toFixed(2).replace(/\.00$/, ''));
                setEditing(true);
              }}
              style={styles.button}
            />
          </View>
          <View style={styles.row}>
            {extra.map((b) => (
              <Button key={b.label} title={b.label} variant="secondary" onPress={b.onPress} style={styles.button} />
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

/**
 * "Awaiting answer" at the top of Finance (finance v2): the salary, loan payments, upcoming
 * payments whose day came, and the weekly balance check — each asks yes / other amount / no.
 * Nothing touches a balance until it's answered.
 */
export function PendingList({ items }: { items: PendingItem[] }) {
  const theme = useTheme();
  const tr = useTranslation();
  const settings = useSettingsStore((s) => s.settings);
  const updateSettings = useSettingsStore((s) => s.updateSettings);
  const state = useFinanceStore();
  const pid = primaryId(state.accounts);
  const categoryById = new Map(state.categories.map((c) => [c.id, c]));
  const app = settings.currency;
  const fmt = (n: number, cur = app) => `${fmtAmount(n)} ${cur}`;
  const day = (key: string) => new Date(`${key}T12:00:00`).toLocaleDateString(tr.localeCode, { day: 'numeric', month: 'short' });

  if (items.length === 0) return null;

  return (
    <View style={styles.list}>
      <Text style={[styles.section, { color: theme.colors.textMuted }]}>{tr.money.pendingTitle}</Text>
      {items.map((item) => {
        switch (item.type) {
          case 'salary': {
            const { due } = item;
            const accountId = state.accounts.some((a) => a.id === settings.salaryAccountId) ? settings.salaryAccountId : pid;
            return (
              <AskCard
                key={item.key}
                emoji="💰"
                title={tr.salaryPrompt.title}
                subtitle={tr.salaryPrompt.expected(fmt(due.amount), formatRangeLabel(due.period, tr.localeCode))}
                amount={due.amount}
                currency={app}
                yesLabel={tr.salaryPrompt.yes}
                onYes={() => state.confirmSalary(due.key, due.amount, accountId)}
                otherLabel={tr.money.otherAmount}
                onOther={(n) => state.confirmSalary(due.key, n, accountId)}
                extra={[{ label: tr.money.notYet, onPress: () => updateSettings({ salaryPromptSnoozedUntil: snoozeUntilTomorrow() }) }]}
              />
            );
          }
          case 'upcoming': {
            const u = item.upcoming;
            const cur = state.accounts.find((a) => a.id === (u.accountId ?? pid))?.currency ?? app;
            const name = u.comment || categoryLabel(categoryById.get(u.categoryId), tr);
            const repeat = u.mode === 'repeat';
            return (
              <AskCard
                key={item.key}
                emoji={repeat ? '🔁' : '🗓️'}
                title={u.mode === 'month' ? tr.money.monthDue(name, fmt(u.amount, cur)) : tr.money.upcomingDue(name, fmt(u.amount, cur))}
                subtitle={u.mode === 'month' ? undefined : day(item.date)}
                amount={u.amount}
                currency={cur}
                yesLabel={tr.money.paid}
                onYes={() => state.answerUpcoming(u.id, u.amount)}
                otherLabel={tr.money.otherAmount}
                onOther={(n) => state.answerUpcoming(u.id, n)}
                extra={[
                  { label: tr.money.notYet, onPress: () => state.snoozePending(item.key) },
                  { label: tr.money.didntHappen, onPress: () => state.answerUpcoming(u.id, null) },
                  ...(repeat ? [{ label: tr.money.stopRepeating, onPress: () => state.removeUpcoming(u.id) }] : []),
                ]}
              />
            );
          }
          case 'loan':
            return (
              <AskCard
                key={item.key}
                emoji="🏦"
                title={tr.money.loanDue(item.loan.name || tr.loans.title, fmt(item.amount, item.loan.currency))}
                subtitle={day(item.date)}
                amount={item.amount}
                currency={item.loan.currency}
                yesLabel={tr.money.paid}
                onYes={() => state.answerLoan(item.loan.id, item.amount)}
                otherLabel={tr.money.otherAmount}
                onOther={(n) => state.answerLoan(item.loan.id, n)}
                extra={[{ label: tr.money.notYet, onPress: () => state.answerLoan(item.loan.id, null) }]}
              />
            );
          case 'check': {
            const a = item.account;
            const expected = balanceOf(a.id, state, pid);
            return (
              <AskCard
                key={item.key}
                emoji="🔎"
                title={tr.money.checkTitle(accountName(a, tr.accounts))}
                subtitle={tr.money.checkBody(fmt(expected, a.currency))}
                amount={expected}
                currency={a.currency}
                yesLabel={tr.money.checkYes}
                onYes={() => state.answerCheck(a.id, null)}
                otherLabel={tr.money.checkOther}
                onOther={(n) => state.answerCheck(a.id, n)}
                extra={[{ label: tr.money.notYet, onPress: () => state.snoozePending(item.key) }]}
              />
            );
          }
        }
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 10 },
  section: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  card: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 6 },
  title: { fontSize: 15, fontWeight: '700' },
  subtitle: { fontSize: 12, lineHeight: 17 },
  actions: { gap: 8, marginTop: 6 },
  editor: { gap: 10, marginTop: 6 },
  row: { flexDirection: 'row', gap: 8 },
  button: { flex: 1 },
});
