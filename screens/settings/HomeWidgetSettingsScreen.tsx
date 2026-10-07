import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { useSettingsStore } from '@/store/useSettingsStore';
import { Button, Screen, SubScreenHeader } from '@/components/ui';
import { deletePersistedImage, pickAndPersistImage } from '@/lib/imagePicker';
import { refreshHomeWidget } from '@/lib/widgetRefresh';
import { useTranslation } from '@/i18n';

export function HomeWidgetSettingsScreen() {
  const theme = useTheme();
  const tr = useTranslation();
  const insets = useSafeAreaInsets();
  const backgroundUri = useSettingsStore((s) => s.settings.homeWidgetBackgroundUri);
  const updateSettings = useSettingsStore((s) => s.updateSettings);

  async function handlePick() {
    const uri = await pickAndPersistImage();
    if (!uri) return;
    if (backgroundUri) await deletePersistedImage(backgroundUri);
    updateSettings({ homeWidgetBackgroundUri: uri });
    refreshHomeWidget();
  }

  async function handleRemove() {
    if (backgroundUri) await deletePersistedImage(backgroundUri);
    updateSettings({ homeWidgetBackgroundUri: null });
    refreshHomeWidget();
  }

  return (
    <Screen style={{ paddingTop: insets.top }}>
      <SubScreenHeader title={tr.homeWidgetSettings.title} />
      <View style={styles.content}>
        <Text style={[styles.hint, { color: theme.colors.textMuted }]}>{tr.homeWidgetSettings.hint}</Text>
        {backgroundUri ? (
          <Image source={{ uri: backgroundUri }} style={styles.preview} />
        ) : (
          <View style={[styles.placeholder, { borderColor: theme.colors.border }]}>
            <Text style={{ color: theme.colors.textMuted }}>{tr.backgroundSettings.notSet}</Text>
          </View>
        )}
        <Button title={backgroundUri ? tr.backgroundSettings.replace : tr.backgroundSettings.pick} onPress={handlePick} />
        {backgroundUri ? <Button title={tr.backgroundSettings.remove} variant="danger" onPress={handleRemove} /> : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, gap: 14 },
  hint: { fontSize: 13, lineHeight: 18, marginTop: -4 },
  preview: { width: '100%', aspectRatio: 16 / 9, borderRadius: 16 },
  placeholder: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
