import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { useSettingsStore } from '@/store/useSettingsStore';
import { Screen } from '@/components/ui';
import { useTranslation } from '@/i18n';

interface Row {
  icon: string;
  title: string;
  value: string;
  route: string;
}

export function SettingsScreen() {
  const theme = useTheme();
  const tr = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const settings = useSettingsStore((s) => s.settings);

  const languageLabels: Record<string, string> = {
    ru: tr.settingsScreen.languageRu,
    uk: tr.settingsScreen.languageUk,
    en: tr.settingsScreen.languageEn,
  };
  const themeLabels: Record<string, string> = {
    light: tr.settingsScreen.themeLight,
    dark: tr.settingsScreen.themeDark,
    system: tr.settingsScreen.themeSystem,
  };

  const rows: Row[] = [
    {
      icon: '💵',
      title: tr.settingsScreen.earnings,
      value: `${settings.hourlyRate} / ${tr.settingsScreen.perHourShort} · ${settings.hoursPerShift}`,
      route: '/settings/earnings',
    },
    {
      icon: '📉',
      title: tr.settingsScreen.budget,
      value: settings.budgetLimitWeek || settings.budgetLimitMonth ? tr.settingsScreen.limitsSet : tr.settingsScreen.notSet,
      route: '/settings/budget',
    },
    { icon: '🎨', title: tr.settingsScreen.theme, value: themeLabels[settings.themeMode], route: '/settings/theme' },
    { icon: '🌐', title: tr.settingsScreen.language, value: languageLabels[settings.language], route: '/settings/language' },
    {
      icon: '🔔',
      title: tr.settingsScreen.notifications,
      value: settings.notificationsEnabled ? tr.settingsScreen.notificationsOn : tr.settingsScreen.notificationsOff,
      route: '/settings/notifications',
    },
    {
      icon: '🖼️',
      title: tr.settingsScreen.background,
      value: settings.backgroundImageUri ? tr.settingsScreen.backgroundSet : tr.settingsScreen.notSet,
      route: '/settings/background',
    },
    {
      icon: '📱',
      title: tr.homeWidgetSettings.title,
      value: settings.homeWidgetBackgroundUri ? tr.settingsScreen.backgroundSet : tr.settingsScreen.notSet,
      route: '/settings/home-widget',
    },
  ];

  return (
    <Screen style={{ paddingTop: insets.top }}>
      <Text style={[styles.header, { color: theme.colors.text }]}>{tr.settingsScreen.header}</Text>

      <View style={styles.list}>
        {rows.map((row) => (
          <Pressable
            key={row.route}
            onPress={() => router.push(row.route as never)}
            style={[styles.row, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
          >
            <Text style={styles.icon}>{row.icon}</Text>
            <Text style={[styles.title, { color: theme.colors.text }]}>{row.title}</Text>
            <Text style={[styles.value, { color: theme.colors.textMuted }]} numberOfLines={1}>
              {row.value}
            </Text>
            <Text style={{ color: theme.colors.textMuted, fontSize: 18 }}>›</Text>
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { fontSize: 26, fontWeight: '700', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16 },
  list: { paddingHorizontal: 16, gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 14, borderWidth: 1 },
  icon: { fontSize: 18 },
  title: { fontSize: 15, fontWeight: '600', flex: 1 },
  value: { fontSize: 13, maxWidth: 140 },
});
