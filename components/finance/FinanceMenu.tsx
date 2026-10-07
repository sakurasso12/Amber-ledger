import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme/ThemeProvider';
import { cardSurface } from '@/theme/surfaces';
import { useTranslation } from '@/i18n';

type IconName = keyof typeof Ionicons.glyphMap;

interface MenuItem {
  key: string;
  icon: IconName;
  title: string;
  route: string;
}

function useMenuItems(): MenuItem[] {
  const tr = useTranslation();

  return [
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
  ];
}

/** Links in the Finance header row ("classic" style). */
export function FinanceMenuHeader() {
  const theme = useTheme();
  const menuStyle = theme.layout.financeMenu;
  const router = useRouter();
  const items = useMenuItems();

  if (menuStyle === 'classic') {
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

/** Menu shown under the header as a row of chips ("chips" style). */
export function FinanceMenuBody() {
  const theme = useTheme();
  const menuStyle = theme.layout.financeMenu;
  const router = useRouter();
  const items = useMenuItems();

  if (menuStyle === 'chips') {
    return (
      <View style={styles.chipsRow}>
        {items.map((item) => (
          <Pressable
            key={item.key}
            onPress={() => router.push(item.route as never)}
            style={({ pressed }) => [
              styles.chip,
              cardSurface(theme),
              theme.design.cardStyle === 'elevated' || theme.design.cardStyle === 'outlined' || theme.design.cardStyle === 'glow' ? { borderRadius: 999 } : null,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  chipText: { fontSize: 14, fontWeight: '600' },
});
