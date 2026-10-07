import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { cornerStyle, LAYOUT_ORDER, LAYOUTS, LayoutId } from '@/theme/layouts';
import { useSettingsStore } from '@/store/useSettingsStore';
import { Screen, SubScreenHeader, Text } from '@/components/ui';
import { useTranslation } from '@/i18n';
import { refreshHomeWidget } from '@/lib/widgetRefresh';

/** Temporary: lets the user try the app layouts (arrangement of every screen) and pick one. */
export function DesignSettingsScreen() {
  const theme = useTheme();
  const tr = useTranslation();
  const insets = useSafeAreaInsets();
  const current = useSettingsStore((s) => s.settings.layoutId);
  const updateSettings = useSettingsStore((s) => s.updateSettings);

  function select(layoutId: LayoutId) {
    updateSettings({ layoutId });
    // Home screen widgets take their corner shape from the layout too.
    setTimeout(() => refreshHomeWidget(), 300);
  }

  return (
    <Screen style={{ paddingTop: insets.top }}>
      <SubScreenHeader title={tr.layouts.settingsTitle} />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}>
        <Text style={[styles.hint, { color: theme.colors.textMuted }]}>{tr.layouts.settingsHint}</Text>
        {LAYOUT_ORDER.map((id) => {
          const selected = id === current;
          const corners = LAYOUTS[id].corners;
          return (
            <Pressable
              key={id}
              onPress={() => select(id)}
              style={[
                styles.option,
                { backgroundColor: theme.colors.surface, borderColor: selected ? theme.colors.accent : theme.colors.border },
              ]}
            >
              {/* Tiny preview of the card shape this layout uses. */}
              <View
                style={[
                  styles.shape,
                  { backgroundColor: selected ? theme.colors.primary : theme.colors.surfaceAlt, borderColor: theme.colors.border },
                  corners ? cornerStyle({ tl: corners.tl / 2, tr: corners.tr / 2, br: corners.br / 2, bl: corners.bl / 2 }) : { borderRadius: 8 },
                ]}
              />
              <View style={styles.optionText}>
                <Text style={[styles.optionTitle, { color: theme.colors.text }]}>{tr.layouts[id]}</Text>
                <Text style={[styles.optionDescription, { color: theme.colors.textMuted }]}>{tr.layouts[`${id}Description` as const]}</Text>
              </View>
              <Ionicons
                name={selected ? 'radio-button-on' : 'radio-button-off'}
                size={22}
                color={selected ? theme.colors.accent : theme.colors.textMuted}
              />
            </Pressable>
          );
        })}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, gap: 10 },
  hint: { fontSize: 13, lineHeight: 18, marginBottom: 4 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14, borderWidth: 1.5 },
  shape: { width: 38, height: 38, borderWidth: 1 },
  optionText: { flex: 1, gap: 3 },
  optionTitle: { fontSize: 15, fontWeight: '700' },
  optionDescription: { fontSize: 12, lineHeight: 17 },
});
