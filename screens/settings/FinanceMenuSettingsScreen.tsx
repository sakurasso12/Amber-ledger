import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { useSettingsStore } from '@/store/useSettingsStore';
import { Screen, SubScreenHeader } from '@/components/ui';
import { useTranslation } from '@/i18n';
import { FinanceMenuStyle } from '@/types';

/** Temporary: lets the user try the Finance menu designs on the phone and pick one. */
export function FinanceMenuSettingsScreen() {
  const theme = useTheme();
  const tr = useTranslation();
  const insets = useSafeAreaInsets();
  const current = useSettingsStore((s) => s.settings.financeMenuStyle);
  const updateSettings = useSettingsStore((s) => s.updateSettings);

  const options: { value: FinanceMenuStyle; title: string; description: string }[] = [
    { value: 'classic', title: tr.financeMenu.classic, description: tr.financeMenu.classicDescription },
    { value: 'chips', title: tr.financeMenu.chips, description: tr.financeMenu.chipsDescription },
    { value: 'tiles', title: tr.financeMenu.tiles, description: tr.financeMenu.tilesDescription },
    { value: 'sheet', title: tr.financeMenu.sheet, description: tr.financeMenu.sheetDescription },
  ];

  return (
    <Screen style={{ paddingTop: insets.top }}>
      <SubScreenHeader title={tr.financeMenu.settingsTitle} />
      <View style={styles.content}>
        <Text style={[styles.hint, { color: theme.colors.textMuted }]}>{tr.financeMenu.settingsHint}</Text>
        {options.map((option) => {
          const selected = option.value === current;
          return (
            <Pressable
              key={option.value}
              onPress={() => updateSettings({ financeMenuStyle: option.value })}
              style={[
                styles.option,
                { backgroundColor: theme.colors.surface, borderColor: selected ? theme.colors.accent : theme.colors.border },
              ]}
            >
              <View style={styles.optionText}>
                <Text style={[styles.optionTitle, { color: theme.colors.text }]}>{option.title}</Text>
                <Text style={[styles.optionDescription, { color: theme.colors.textMuted }]}>{option.description}</Text>
              </View>
              <Ionicons
                name={selected ? 'radio-button-on' : 'radio-button-off'}
                size={22}
                color={selected ? theme.colors.accent : theme.colors.textMuted}
              />
            </Pressable>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, gap: 10 },
  hint: { fontSize: 13, lineHeight: 18, marginBottom: 4 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14, borderWidth: 1.5 },
  optionText: { flex: 1, gap: 3 },
  optionTitle: { fontSize: 15, fontWeight: '700' },
  optionDescription: { fontSize: 12, lineHeight: 17 },
});
