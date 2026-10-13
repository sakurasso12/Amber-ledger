import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme/ThemeProvider';
import { cardSurface } from '@/theme/surfaces';
import { useTranslation } from '@/i18n';
import { useFinanceStore } from '@/store/useFinanceStore';

type IconName = keyof typeof Ionicons.glyphMap;

interface MenuItem {
  key: string;
  icon: IconName;
  title: string;
  route: string;
}

function useMenuItems(): MenuItem[] {
  const tr = useTranslation();
  // The old "Planned" list (future expenses taken off the forecast) is replaced by spending plans
  // with their bars; it stays reachable only while something is still in it.
  const hasOldPlanned = useFinanceStore((s) => s.plannedExpenses.length > 0);

  const items: MenuItem[] = [
    {
      key: 'recurring',
      icon: 'repeat',
      title: tr.financeScreen.recurringLink,
      route: '/expense/recurring',
    },
    {
      key: 'planned',
      icon: 'calendar-outline',
      title: tr.financeScreen.plannedLink,
      route: '/expense/planned',
    },
    {
      key: 'categories',
      icon: 'pricetags-outline',
      title: tr.financeScreen.categoriesLink,
      route: '/category/manage',
    },
    {
      // The whole Earnings screen (rate, hours per shift, currency, pay period, payday) — moved here from Settings.
      key: 'rate',
      icon: 'cash-outline',
      title: tr.financeScreen.rateLink,
      route: '/settings/earnings',
    },
  ];
  return hasOldPlanned ? items : items.filter((item) => item.key !== 'planned');
}

/**
 * Links in the Finance header row ("classic" style). Off for now: with the rate added and the
 * edit-mode buttons next to it the header ran out of room, so every layout uses the chips.
 */
const HEADER_LINKS = false;

export function FinanceMenuHeader() {
  const theme = useTheme();
  const menuStyle = theme.layout.financeMenu;
  const router = useRouter();
  const items = useMenuItems();

  if (HEADER_LINKS && menuStyle === 'classic') {
    return (
      <View style={styles.classicLinks}>
        {items.map((item) => (
          <Pressable key={item.key} onPress={() => router.push(item.route as never)}>
            <Text style={{ color: theme.colors.accent, fontWeight: '600', fontSize: 13 }}>{item.title}</Text>
          </Pressable>
        ))}
      </View>
    );
  }

  return null;
}

/** Menu shown under the header as a row of chips — icon over the label, so four fit in a row. */
export function FinanceMenuBody() {
  const theme = useTheme();
  const menuStyle = theme.layout.financeMenu;
  const router = useRouter();
  const items = useMenuItems();

  if (!HEADER_LINKS || menuStyle === 'chips') {
    return (
      <View style={styles.chipsRow}>
        {items.map((item) => (
          <Pressable
            key={item.key}
            onPress={() => router.push(item.route as never)}
            style={({ pressed }) => [
              styles.chip,
              cardSurface(theme),
              theme.design.cardStyle === 'elevated' || theme.design.cardStyle === 'outlined' ? { borderRadius: 999 } : null,
              { opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Ionicons name={item.icon} size={18} color={theme.colors.accent} />
            <Text style={[styles.chipText, { color: theme.colors.text }]} numberOfLines={1}>
              {item.title}
            </Text>
          </Pressable>
        ))}
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  classicLinks: { flexDirection: 'row', gap: 14 },

  chipsRow: { flexDirection: 'row', gap: 8 },
  chip: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  chipText: { fontSize: 12, fontWeight: '600' },
});
