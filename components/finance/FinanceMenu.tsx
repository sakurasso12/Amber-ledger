import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { cardSurface } from '@/theme/surfaces';
import { useFinanceStore } from '@/store/useFinanceStore';
import { useTranslation } from '@/i18n';

type IconName = keyof typeof Ionicons.glyphMap;

interface MenuItem {
  key: string;
  icon: IconName;
  title: string;
  description: string;
  /** Short live figure shown on tiles, e.g. "3" or "−1200 zł". */
  value: string;
  route: string;
}

function useMenuItems(currency: string): MenuItem[] {
  const tr = useTranslation();
  const recurringCount = useFinanceStore((s) => s.recurringExpenses.length);
  const plannedTotal = useFinanceStore((s) => s.plannedExpenses.reduce((sum, p) => sum + p.amount, 0));
  const categoryCount = useFinanceStore((s) => s.categories.length);

  return [
    {
      key: 'recurring',
      icon: 'repeat',
      title: tr.financeScreen.recurringLink,
      description: tr.financeMenu.recurringDescription,
      value: String(recurringCount),
      route: '/expense/recurring',
    },
    {
      key: 'planned',
      icon: 'calendar-outline',
      title: tr.financeScreen.plannedLink,
      description: tr.financeMenu.plannedDescription,
      value: plannedTotal > 0 ? `−${plannedTotal.toFixed(0)} ${currency}` : '0',
      route: '/expense/planned',
    },
    {
      key: 'categories',
      icon: 'pricetags-outline',
      title: tr.financeScreen.categoriesLink,
      description: tr.financeMenu.categoriesDescription,
      value: String(categoryCount),
      route: '/category/manage',
    },
  ];
}

/** Links in the Finance header row — "classic" text links, or the "⋯" button for the sheet style. */
export function FinanceMenuHeader({ currency }: { currency: string }) {
  const theme = useTheme();
  const menuStyle = theme.design.financeMenu;
  const router = useRouter();
  const items = useMenuItems(currency);
  const [sheetOpen, setSheetOpen] = useState(false);

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

  if (menuStyle === 'sheet') {
    return (
      <>
        <Pressable
          onPress={() => setSheetOpen(true)}
          hitSlop={10}
          style={[styles.moreButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
        >
          <Ionicons name="ellipsis-horizontal" size={20} color={theme.colors.text} />
        </Pressable>
        <MenuSheet items={items} visible={sheetOpen} onClose={() => setSheetOpen(false)} />
      </>
    );
  }

  return null;
}

/** Menu shown under the header — horizontal chips or a row of tiles with live figures. */
export function FinanceMenuBody({ currency }: { currency: string }) {
  const theme = useTheme();
  const menuStyle = theme.design.financeMenu;
  const router = useRouter();
  const items = useMenuItems(currency);

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

  if (menuStyle === 'tiles') {
    return (
      <View style={styles.tilesRow}>
        {items.map((item) => (
          <Pressable
            key={item.key}
            onPress={() => router.push(item.route as never)}
            style={({ pressed }) => [
              styles.tile,
              cardSurface(theme),
              { opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <View style={[styles.tileIcon, { backgroundColor: `${theme.colors.accent}26` }]}>
              <Ionicons name={item.icon} size={20} color={theme.colors.accent} />
            </View>
            <Text style={[styles.tileValue, { color: theme.colors.text }]} numberOfLines={1}>
              {item.value}
            </Text>
            <Text style={[styles.tileTitle, { color: theme.colors.textMuted }]} numberOfLines={1}>
              {item.title}
            </Text>
          </Pressable>
        ))}
      </View>
    );
  }

  return null;
}

function MenuSheet({ items, visible, onClose }: { items: MenuItem[]; visible: boolean; onClose: () => void }) {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.sheetBackdrop} onPress={onClose}>
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={[
            styles.sheet,
            { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, paddingBottom: insets.bottom + 16 },
          ]}
        >
          <View style={[styles.sheetHandle, { backgroundColor: theme.colors.border }]} />
          {items.map((item) => (
            <Pressable
              key={item.key}
              onPress={() => {
                onClose();
                router.push(item.route as never);
              }}
              style={({ pressed }) => [styles.sheetRow, { opacity: pressed ? 0.6 : 1 }]}
            >
              <View style={[styles.tileIcon, { backgroundColor: `${theme.colors.accent}26` }]}>
                <Ionicons name={item.icon} size={22} color={theme.colors.accent} />
              </View>
              <View style={styles.sheetText}>
                <Text style={[styles.sheetTitle, { color: theme.colors.text }]}>{item.title}</Text>
                <Text style={[styles.sheetDescription, { color: theme.colors.textMuted }]}>{item.description}</Text>
              </View>
              <Text style={[styles.sheetValue, { color: theme.colors.textMuted }]}>{item.value}</Text>
              <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
            </Pressable>
          ))}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  classicLinks: { flexDirection: 'row', gap: 14 },
  moreButton: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },

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

  tilesRow: { flexDirection: 'row', gap: 10 },
  tile: { flex: 1, padding: 12, gap: 6 },
  tileIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  tileValue: { fontSize: 17, fontWeight: '800' },
  tileTitle: { fontSize: 12, fontWeight: '600' },

  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, paddingHorizontal: 16, paddingTop: 10, gap: 4 },
  sheetHandle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, marginBottom: 10 },
  sheetRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  sheetText: { flex: 1, gap: 2 },
  sheetTitle: { fontSize: 16, fontWeight: '700' },
  sheetDescription: { fontSize: 12, lineHeight: 16 },
  sheetValue: { fontSize: 13, fontWeight: '600' },
});
