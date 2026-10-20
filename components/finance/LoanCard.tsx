import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { Button, CustomizableCard, DateField, ProgressBar, TextField } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';
import { useFinanceStore } from '@/store/useFinanceStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { MAIN_ACCOUNT_ID } from '@/lib/accounts';
import { daysToPayment, isPaidOff, LOAN_REMINDER_DAYS, monthlyPayment, nextPaymentDate, remainingDebt, totalInterest } from '@/lib/loans';
import { parseDateKey, todayKey } from '@/lib/dateRanges';
import { haptics } from '@/lib/haptics';
import { useTranslation } from '@/i18n';
import { Loan } from '@/types';
import { AccountPicker } from './AccountPicker';
import { MoneyDialog } from './MoneyDialog';

const parseNumber = (text: string) => parseFloat(text.replace(',', '.'));

/**
 * A loan on the Finance board: the monthly payment, what's left, how much of the term is paid and
 * when the next payment is. "Paid" logs the payment as an expense of the card it was paid from.
 */
export function LoanCard({ loan, disabled }: { loan: Loan; disabled: boolean }) {
  const theme = useTheme();
  const tr = useTranslation();
  const payLoan = useFinanceStore((s) => s.payLoan);
  const removeLoan = useFinanceStore((s) => s.removeLoan);
  const [step, setStep] = useState<null | 'menu' | 'pay' | 'edit'>(null);
  const [payFrom, setPayFrom] = useState(MAIN_ACCOUNT_ID);

  const pay = monthlyPayment(loan);
  const money = (n: number) => `${n.toFixed(0)} ${loan.currency}`;
  const next = nextPaymentDate(loan);
  const days = daysToPayment(loan);
  const paidOff = isPaidOff(loan);
  // Red when it's overdue, the accent colour inside the reminder window.
  const soon = days !== null && days <= LOAN_REMINDER_DAYS;
  const when =
    days === null ? '' : days === 0 ? tr.loans.today : days < 0 ? tr.loans.overdue(-days) : tr.loans.inDays(days);
  const dateLabel = next ? parseDateKey(next).toLocaleDateString(tr.localeCode, { day: 'numeric', month: 'short' }) : '';
  const close = () => setStep(null);

  function confirmRemove() {
    Alert.alert(tr.loans.removeTitle, tr.loans.removeText, [
      { text: tr.loans.cancel, style: 'cancel' },
      {
        text: tr.loans.remove,
        style: 'destructive',
        onPress: () => {
          close();
          removeLoan(loan.id);
        },
      },
    ]);
  }

  return (
    <>
      <Pressable onPress={() => setStep('menu')} disabled={disabled}>
        <CustomizableCard widgetId={`loan-${loan.id}`} style={styles.card}>
          <View style={styles.headRow}>
            <Text style={[styles.header, { color: theme.colors.textMuted }]} numberOfLines={1}>
              🏦 {loan.name || tr.loans.title}
            </Text>
            {paidOff ? null : (
              <Text style={[styles.monthly, { color: theme.colors.text }]}>
                {money(pay)} <Text style={{ color: theme.colors.textMuted, fontSize: 11 }}>/ {tr.loans.monthly.toLowerCase()}</Text>
              </Text>
            )}
          </View>
          {paidOff ? (
            <Text style={[styles.amount, { color: theme.colors.success }]}>{tr.loans.paidOff}</Text>
          ) : (
            <>
              <Text style={[styles.amount, { color: theme.colors.text }]} numberOfLines={1} adjustsFontSizeToFit>
                {tr.loans.left}: {money(remainingDebt(loan))}
              </Text>
              <ProgressBar ratio={loan.months > 0 ? loan.paidCount / loan.months : 0} color={theme.colors.success} />
              <View style={styles.headRow}>
                <Text style={[styles.subline, { color: theme.colors.textMuted }]}>{tr.loans.paid(loan.paidCount, loan.months)}</Text>
                <Text style={[styles.subline, { color: days !== null && days < 0 ? theme.colors.danger : soon ? theme.colors.accent : theme.colors.textMuted }]}>
                  {dateLabel} · {when}
                </Text>
              </View>
            </>
          )}
        </CustomizableCard>
      </Pressable>

      <MoneyDialog visible={step === 'menu'} onClose={close} title={loan.name || tr.loans.title}>
        <Text style={[styles.info, { color: theme.colors.text }]}>
          {tr.loans.monthly}: {money(pay)}
          {'\n'}
          {tr.loans.left}: {money(remainingDebt(loan))}
          {'\n'}
          {tr.loans.overpay}: {money(totalInterest(loan))}
          {next ? `\n${tr.loans.next(dateLabel)}` : ''}
        </Text>
        {paidOff ? null : <Button title={tr.loans.pay} onPress={() => setStep('pay')} />}
        <Button title={tr.loans.edit} variant="secondary" onPress={() => setStep('edit')} />
        <Button title={tr.loans.remove} variant="danger" onPress={confirmRemove} />
      </MoneyDialog>

      <MoneyDialog visible={step === 'pay'} onClose={close} title={tr.loans.payTitle(money(pay))}>
        <AccountPicker label={tr.loans.payFrom} value={payFrom} onChange={setPayFrom} />
        <View style={styles.buttons}>
          <Button title={tr.loans.cancel} variant="secondary" onPress={close} style={styles.flex} />
          <Button
            title={tr.loans.pay}
            onPress={async () => {
              await payLoan(loan.id, payFrom);
              haptics.success();
              close();
            }}
            style={styles.flex}
          />
        </View>
      </MoneyDialog>

      <LoanFormDialog visible={step === 'edit'} loan={loan} onClose={close} />
    </>
  );
}

/** New loan (no `loan`) or its terms (with `loan`). */
export function LoanFormDialog({ visible, loan, onClose }: { visible: boolean; loan?: Loan; onClose: () => void }) {
  const tr = useTranslation();
  const appCurrency = useSettingsStore((s) => s.settings.currency);
  const addLoan = useFinanceStore((s) => s.addLoan);
  const updateLoan = useFinanceStore((s) => s.updateLoan);
  const [name, setName] = useState('');
  const [principal, setPrincipal] = useState('');
  const [rate, setRate] = useState('');
  const [months, setMonths] = useState('');
  const [firstPayment, setFirstPayment] = useState(todayKey());
  const [paidCount, setPaidCount] = useState('0');

  const [wasVisible, setWasVisible] = useState(visible);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) {
      setName(loan?.name ?? '');
      setPrincipal(loan ? String(loan.principal) : '');
      setRate(loan ? String(loan.ratePercent) : '');
      setMonths(loan ? String(loan.months) : '');
      setFirstPayment(loan?.firstPayment ?? todayKey());
      setPaidCount(String(loan?.paidCount ?? 0));
    }
  }

  const currency = loan?.currency ?? appCurrency;
  async function save() {
    const p = parseNumber(principal);
    const r = parseNumber(rate || '0');
    const m = parseInt(months, 10);
    const paid = Math.max(0, parseInt(paidCount || '0', 10) || 0);
    if (!(p > 0) || !(m > 0) || !Number.isFinite(r) || r < 0) {
      Alert.alert(tr.loans.principal(currency), tr.loans.months);
      return;
    }
    // Already a few payments into it: they're counted without logging old expenses.
    const terms = { name: name.trim(), principal: p, ratePercent: r, months: m, firstPayment, currency, paidCount: Math.min(paid, m) };
    if (loan) await updateLoan({ ...loan, ...terms });
    else await addLoan(terms);
    haptics.success();
    onClose();
  }

  return (
    <MoneyDialog visible={visible} onClose={onClose} title={loan ? tr.loans.edit : tr.accounts.addLoan}>
      <TextField label={tr.loans.name} value={name} onChangeText={setName} placeholder={tr.loans.namePlaceholder} />
      <TextField label={tr.loans.principal(currency)} value={principal} onChangeText={setPrincipal} keyboardType="decimal-pad" placeholder="0" />
      <TextField label={tr.loans.rate} value={rate} onChangeText={setRate} keyboardType="decimal-pad" placeholder="0" />
      <TextField label={tr.loans.months} value={months} onChangeText={setMonths} keyboardType="number-pad" placeholder="12" />
      <DateField label={tr.loans.firstPayment} value={firstPayment} onChange={setFirstPayment} />
      <TextField label={tr.loans.paidAlready} value={paidCount} onChangeText={setPaidCount} keyboardType="number-pad" placeholder="0" />
      <View style={styles.buttons}>
        <Button title={tr.loans.cancel} variant="secondary" onPress={onClose} style={styles.flex} />
        <Button title={loan ? tr.loans.save : tr.loans.create} onPress={save} style={styles.flex} />
      </View>
    </MoneyDialog>
  );
}

const styles = StyleSheet.create({
  card: { gap: 6 },
  headRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 },
  header: { flexShrink: 1, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 },
  monthly: { fontSize: 14, fontWeight: '800' },
  amount: { fontSize: 20, fontWeight: '800' },
  subline: { fontSize: 11 },
  info: { fontSize: 14, lineHeight: 21 },
  buttons: { flexDirection: 'row', gap: 10 },
  flex: { flex: 1 },
});
