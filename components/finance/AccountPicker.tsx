import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/Text';
import { Chip } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';
import { useFinanceStore } from '@/store/useFinanceStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { accountName, isSpendable, MAIN_ACCOUNT_ID, mainAccountName } from '@/lib/accounts';
import { useTranslation } from '@/i18n';

export interface AccountOption {
  id: string;
  label: string;
  currency: string;
}

/** No account: a goal deposit that only counts (nothing is taken off a card). */
export const NO_ACCOUNT_ID = 'none';

/** The main card first, then the other cards and cash wallets in their order (stashes and goals
 * aren't paid from). */
export function useAccountOptions(): AccountOption[] {
  const tr = useTranslation();
  const accounts = useFinanceStore((s) => s.accounts);
  const settings = useSettingsStore((s) => s.settings);
  return [
    { id: MAIN_ACCOUNT_ID, label: `💳 ${mainAccountName(settings, tr.accounts.card)}`, currency: settings.currency },
    ...accounts.filter(isSpendable).map((a) => ({
      id: a.id,
      label: `${a.kind === 'cash' ? '💵' : '💳'} ${accountName(a, tr.accounts)} · ${a.currency}`,
      currency: a.currency,
    })),
  ];
}

interface AccountPickerProps {
  label: string;
  value: string;
  onChange: (accountId: string) => void;
  /** Accounts not offered (e.g. the one a transfer comes from). */
  exclude?: string[];
  /** Extra chips after the accounts (e.g. "just count it"). */
  extra?: AccountOption[];
}

/** A row of chips to pick a card or cash wallet. */
export function AccountPicker({ label, value, onChange, exclude = [], extra = [] }: AccountPickerProps) {
  const theme = useTheme();
  const options = [...useAccountOptions(), ...extra].filter((o) => !exclude.includes(o.id));
  return (
    <>
      {label ? <Text style={[styles.label, { color: theme.colors.textMuted }]}>{label}</Text> : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {options.map((o) => (
          <Chip key={o.id} label={o.label} selected={value === o.id} onPress={() => onChange(o.id)} />
        ))}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: '600', marginBottom: 8 },
  row: { flexDirection: 'row', gap: 6, paddingBottom: 2 },
});
