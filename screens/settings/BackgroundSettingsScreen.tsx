import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { useSettingsStore } from '@/store/useSettingsStore';
import { Button, Screen, SubScreenHeader } from '@/components/ui';
import { deletePersistedImage, pickAndPersistImage } from '@/lib/imagePicker';
import { useTranslation } from '@/i18n';

export function BackgroundSettingsScreen() {
  const theme = useTheme();
  const tr = useTranslation();
  const insets = useSafeAreaInsets();
  const backgroundImageUri = useSettingsStore((s) => s.settings.backgroundImageUri);
  const updateSettings = useSettingsStore((s) => s.updateSettings);

  async function handlePick() {
    const uri = await pickAndPersistImage();
    if (!uri) return;
    if (backgroundImageUri) await deletePersistedImage(backgroundImageUri);
    updateSettings({ backgroundImageUri: uri });
  }

  async function handleRemove() {
    if (backgroundImageUri) await deletePersistedImage(backgroundImageUri);
    updateSettings({ backgroundImageUri: null });
  }

  return (
    <Screen style={{ paddingTop: insets.top }}>
      <SubScreenHeader title={tr.backgroundSettings.title} />
      <View style={[styles.content, { paddingBottom: insets.bottom + 16 }]}>
        {backgroundImageUri ? (
          <Image source={{ uri: backgroundImageUri }} style={styles.preview} resizeMode="cover" />
        ) : (
          <View style={[styles.placeholder, { borderColor: theme.colors.border }]}>
            <Text style={{ color: theme.colors.textMuted }}>{tr.backgroundSettings.notSet}</Text>
          </View>
        )}
        <Button title={backgroundImageUri ? tr.backgroundSettings.replace : tr.backgroundSettings.pick} onPress={handlePick} />
        {backgroundImageUri ? <Button title={tr.backgroundSettings.remove} variant="danger" onPress={handleRemove} /> : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  // The preview takes whatever height is left, so the buttons always stay above the nav bar.
  content: { flex: 1, paddingHorizontal: 16, gap: 14 },
  preview: { flex: 1, width: '100%', borderRadius: 16 },
  placeholder: {
    flex: 1,
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
