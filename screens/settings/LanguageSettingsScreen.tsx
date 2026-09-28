import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { useSettingsStore } from '@/store/useSettingsStore';
import { Chip, Screen, SubScreenHeader } from '@/components/ui';
import { useTranslation } from '@/i18n';
import { AppLanguage } from '@/types';

export function LanguageSettingsScreen() {
  const theme = useTheme();
  const tr = useTranslation();
  const insets = useSafeAreaInsets();
  const settings = useSettingsStore((s) => s.settings);
  const updateSettings = useSettingsStore((s) => s.updateSettings);

  const languages: { value: AppLanguage; label: string }[] = [
    { value: 'ru', label: tr.settingsScreen.languageRu },
    { value: 'uk', label: tr.settingsScreen.languageUk },
    { value: 'en', label: tr.settingsScreen.languageEn },
  ];

  return (
    <Screen style={{ paddingTop: insets.top }}>
      <SubScreenHeader title={tr.languageSettings.title} />
      <View style={styles.content}>
        <View style={styles.row}>
          {languages.map((lang) => (
            <Chip
              key={lang.value}
              label={lang.label}
              selected={settings.language === lang.value}
              onPress={() => updateSettings({ language: lang.value })}
            />
          ))}
        </View>
        <Text style={[styles.note, { color: theme.colors.textMuted }]}>{tr.languageSettings.note}</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, gap: 16 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  note: { fontSize: 12, lineHeight: 18 },
});
