import React from 'react';
import { StyleProp, ImageBackground, StyleSheet, View, ViewStyle } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { useSettingsStore } from '@/store/useSettingsStore';
import { deletePersistedImage, pickAndPersistImage } from '@/lib/imagePicker';
import { WidgetMenu } from './WidgetMenu';

interface CustomizableCardProps {
  /** Stable id for this widget's background, e.g. "finance-balance" — must be unique app-wide. */
  widgetId: string;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

/** A Card that can carry its own background photo, set via the "⋮" menu in its corner. */
export function CustomizableCard({ widgetId, children, style }: CustomizableCardProps) {
  const theme = useTheme();
  const imageUri = useSettingsStore((s) => s.settings.widgetBackgrounds[widgetId]);
  const setWidgetBackground = useSettingsStore((s) => s.setWidgetBackground);
  const clearWidgetBackground = useSettingsStore((s) => s.clearWidgetBackground);

  async function handlePick() {
    const uri = await pickAndPersistImage();
    if (uri) setWidgetBackground(widgetId, uri);
  }

  async function handleRemove() {
    if (imageUri) await deletePersistedImage(imageUri);
    clearWidgetBackground(widgetId);
  }

  const menu = (
    <View style={styles.menuAnchor}>
      <WidgetMenu
        hasImage={!!imageUri}
        onPickImage={handlePick}
        onRemoveImage={handleRemove}
        tint={imageUri ? 'light' : undefined}
      />
    </View>
  );

  if (imageUri) {
    return (
      <ImageBackground
        source={{ uri: imageUri }}
        style={[styles.base, { borderColor: theme.colors.border }, style]}
        imageStyle={styles.image}
      >
        <View style={[styles.overlay, { backgroundColor: `${theme.colors.background}80` }]}>
          {menu}
          {children}
        </View>
      </ImageBackground>
    );
  }

  return (
    <View style={[styles.base, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }, style]}>
      <View style={styles.overlay}>
        {menu}
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  image: { borderRadius: 16 },
  overlay: { padding: 14 },
  menuAnchor: { position: 'absolute', top: 6, right: 6, zIndex: 1 },
});
