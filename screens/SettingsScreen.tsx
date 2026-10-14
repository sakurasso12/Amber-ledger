import React from 'react';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { cardSurface } from '@/theme/surfaces';
import { useSettingsStore } from '@/store/useSettingsStore';
import { LayoutScreen, PressableScale } from '@/components/ui';
import { useTranslation } from '@/i18n';
import { APP_VERSION } from '@/components/onboarding/WhatsNew';

interface Row {
  icon: string;
  title: string;
  value: string;
  route: string;
  /** Opens outside the app (Telegram) instead of a settings screen. */
  url?: string;
}

const CHANNEL_URL = 'https://t.me/amberledger';
// The bot reads the version from the start parameter: 1.3.2 → v1_3_2.
const supportUrl = () => `https://t.me/amberledgerbot?start=v${APP_VERSION.replace(/\./g, '_')}`;

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
      icon: '👤',
      title: tr.profileSettings.title,
      value: settings.profileName.trim() || tr.profileSettings.noName,
      route: '/settings/profile',
    },
    {
      // Security & storage: the finance lock plus clean-up and erasing data.
      icon: '🔒',
      title: tr.securitySettings.title,
      value: settings.financeLockEnabled
        ? `${settings.financeLockMethod === 'device' ? tr.securitySettings.methodDevice : tr.securitySettings.methodPassword} · ${settings.financeLockMinutes} ${tr.securitySettings.minutes}`
        : tr.settingsScreen.notSet,
      route: '/settings/security',
    },
    // Earnings (hourly rate) moved to the Finance screen as the "Rate" chip.
    // Budget limits are switched off for now — unused; the screen (/settings/budget) still exists,
    // put this row back to bring them back:
    // {
    //   icon: '📉',
    //   title: tr.settingsScreen.budget,
    //   value: settings.budgetLimitWeek || settings.budgetLimitMonth ? tr.settingsScreen.limitsSet : tr.settingsScreen.notSet,
    //   route: '/settings/budget',
    // },
    { icon: '🎨', title: tr.settingsScreen.theme, value: `${tr.designs[settings.designId]} · ${themeLabels[settings.themeMode]}`, route: '/settings/theme' },
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
    { icon: '💬', title: tr.settingsScreen.support, value: tr.settingsScreen.supportValue, route: 'support', url: supportUrl() },
    { icon: '📣', title: tr.settingsScreen.channel, value: '@amberledger', route: 'channel', url: CHANNEL_URL },
  ];

  const mode = theme.layout.settings;
  const open = (row: Row) => (row.url ? Linking.openURL(row.url) : router.push(row.route as never));

  let body: React.ReactNode;
  if (mode === 'big') {
    // Vertical: big rows with the icon in a circle.
    body = (
      <View style={styles.list}>
        {rows.map((row) => (
          <PressableScale key={row.route} onPress={() => open(row)} style={[styles.bigRow, cardSurface(theme)]}>
            <View style={[styles.bigIcon, { backgroundColor: `${theme.colors.primary}22` }]}>
              <Text style={styles.bigIconText}>{row.icon}</Text>
            </View>
            <View style={styles.flex}>
              <Text style={[styles.bigTitle, { color: theme.colors.text }]}>{row.title}</Text>
              <Text style={[styles.value, { color: theme.colors.textMuted, maxWidth: undefined }]} numberOfLines={1}>
                {row.value}
              </Text>
            </View>
          </PressableScale>
        ))}
      </View>
    );
  } else {
    body = (
      <View style={styles.list}>
        {rows.map((row) => (
          <PressableScale key={row.route} onPress={() => open(row)} style={[styles.row, cardSurface(theme)]}>
            <Text style={styles.icon}>{row.icon}</Text>
            <Text style={[styles.title, { color: theme.colors.text }]}>{row.title}</Text>
            <Text style={[styles.value, { color: theme.colors.textMuted }]} numberOfLines={1}>
              {row.value}
            </Text>
            <Text style={{ color: theme.colors.textMuted, fontSize: 18 }}>›</Text>
          </PressableScale>
        ))}
      </View>
    );
  }

  return (
    <LayoutScreen title={tr.settingsScreen.header}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>{body}</ScrollView>
    </LayoutScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  bigRow: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14 },
  bigIcon: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  bigIconText: { fontSize: 24 },
  bigTitle: { fontSize: 17, fontWeight: '700' },
  list: { paddingHorizontal: 16, gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 14, borderWidth: 1 },
  icon: { fontSize: 18 },
  title: { fontSize: 15, fontWeight: '600', flex: 1 },
  value: { fontSize: 13, maxWidth: 140 },
});
