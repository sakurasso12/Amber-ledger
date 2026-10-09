import React, { useState } from 'react';
import { StyleProp, ImageBackground, Pressable, StyleSheet, View, ViewStyle } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { cardSurface } from '@/theme/surfaces';
import { useSettingsStore } from '@/store/useSettingsStore';
import { deletePersistedImage, pickAndPersistImage } from '@/lib/imagePicker';
import { refreshHomeWidget } from '@/lib/widgetRefresh';
import { WidgetMenu } from './WidgetMenu';
import { CardShapeSheet } from './CardShapeSheet';
import { useLayoutEditing } from './LayoutEditing';

interface CustomizableCardProps {
  /** Stable id for this card's background and shape, e.g. "finance-balance" — unique app-wide. */
  widgetId: string;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Inner padding; defaults to the theme's card padding. */
  padding?: number;
  /** Dark scrim over a background photo, so light text stays readable. Default: a light veil. */
  photoScrim?: string;
}

/**
 * A card that can carry its own background photo and corner shape, both set from the "⋮" menu in
 * its corner. While the screen's layout is being edited, tapping the card opens the shape picker.
 */
export function CustomizableCard({ widgetId, children, style, padding, photoScrim }: CustomizableCardProps) {
  const theme = useTheme();
  const editing = useLayoutEditing();
  const imageUri = useSettingsStore((s) => s.settings.widgetBackgrounds[widgetId]);
  const shape = useSettingsStore((s) => s.settings.cardShapes[widgetId] ?? null);
  const setWidgetBackground = useSettingsStore((s) => s.setWidgetBackground);
  const clearWidgetBackground = useSettingsStore((s) => s.clearWidgetBackground);
  const [shapeOpen, setShapeOpen] = useState(false);

  async function handlePick() {
    const uri = await pickAndPersistImage();
    if (uri) setWidgetBackground(widgetId, uri);
    // A habit's photo also shows on its streak widget — redraw once the setting is saved.
    setTimeout(() => refreshHomeWidget(), 300);
  }

  async function handleRemove() {
    if (imageUri) await deletePersistedImage(imageUri);
    clearWidgetBackground(widgetId);
    setTimeout(() => refreshHomeWidget(), 300);
  }

  const surface = cardSurface(theme, shape);
  const innerPadding = { padding: padding ?? theme.design.cardPadding };

  const menu = (
    <View style={styles.menuAnchor}>
      <WidgetMenu
        hasImage={!!imageUri}
        onPickImage={handlePick}
        onRemoveImage={handleRemove}
        onPickShape={() => setShapeOpen(true)}
        tint={imageUri ? 'light' : undefined}
      />
    </View>
  );

  const extras = (
    <>
      {/* Edit mode: the whole card becomes a "change the shape" button. */}
      {editing ? <Pressable style={StyleSheet.absoluteFill} onPress={() => setShapeOpen(true)} /> : null}
      <CardShapeSheet cardId={widgetId} visible={shapeOpen} onClose={() => setShapeOpen(false)} />
    </>
  );

  if (imageUri) {
    return (
      // overflow: hidden clips the photo and its scrim to the card's exact corners — including the
      // per-corner shapes of the Vertical layout — so no square photo edges poke out.
      <ImageBackground source={{ uri: imageUri }} resizeMode="cover" style={[styles.base, surface, styles.clip, style]}>
        <View style={[styles.inner, innerPadding, { backgroundColor: photoScrim ?? `${theme.colors.background}80` }]}>
          {menu}
          {children}
        </View>
        {extras}
      </ImageBackground>
    );
  }

  return (
    <View style={[styles.base, surface, style]}>
      <View style={[styles.inner, innerPadding]}>
        {menu}
        {children}
      </View>
      {extras}
    </View>
  );
}

const styles = StyleSheet.create({
  // overflow stays visible for the elevated design, otherwise Android clips its shadow.
  base: {},
  clip: { overflow: 'hidden' },
  // Fills cards given a fixed size (e.g. the square level card) so their content can centre.
  inner: { flexGrow: 1 },
  menuAnchor: { position: 'absolute', top: 6, right: 6, zIndex: 1 },
});
