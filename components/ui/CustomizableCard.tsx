import React, { useState } from 'react';
import { StyleProp, ImageBackground, Pressable, StyleSheet, View, ViewStyle } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { BlurView } from 'expo-blur';
import { cardSurface } from '@/theme/surfaces';
import { withAlpha } from '@/theme/theme';
import { useSettingsStore } from '@/store/useSettingsStore';
import { deletePersistedImage, pickAndPersistImage } from '@/lib/imagePicker';
import { refreshHomeWidget } from '@/lib/widgetRefresh';
import { WidgetMenu } from './WidgetMenu';
import { CardShapeSheet } from './CardShapeSheet';
import { useLayoutEditing } from './LayoutEditing';
import { useBackdrop } from './Screen';

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
  const ownBackground = useSettingsStore((s) => s.settings.cardBackgrounds?.[widgetId] ?? null);
  const ownOpacity = useSettingsStore((s) => s.settings.cardOpacity?.[widgetId] ?? null);
  const backdrop = useBackdrop();
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

  const surface = cardSurface(theme, shape, ownBackground, ownOpacity);
  // Glass: the card's own pick, or the theme's card style (the vivid finish usually).
  const glass = ownBackground === 'glass' || (!ownBackground && theme.design.cardStyle === 'glass');
  const innerPadding = { padding: padding ?? theme.design.cardPadding };

  const menu = (
    <View style={styles.menuAnchor}>
      <WidgetMenu onPress={() => setShapeOpen(true)} tint={imageUri ? 'light' : undefined} />
    </View>
  );

  const extras = (
    <>
      {/* Edit mode: the whole card becomes a "change the shape" button. */}
      {editing ? <Pressable style={StyleSheet.absoluteFill} onPress={() => setShapeOpen(true)} /> : null}
      <CardShapeSheet
        cardId={widgetId}
        visible={shapeOpen}
        onClose={() => setShapeOpen(false)}
        hasImage={!!imageUri}
        onPickImage={handlePick}
        onRemoveImage={handleRemove}
      />
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
    <View style={[styles.base, surface, glass && backdrop ? styles.clearBg : null, style]}>
      {glass ? (
        // Real blur of the screen's gradient/photo behind the card (Android 12+; older phones just get
        // the see-through colour). Without a backdrop there's nothing to blur, so it's skipped.
        backdrop ? (
          <BlurView
            blurTarget={backdrop}
            blurMethod="dimezisBlurViewSdk31Plus"
            // expo-blur ties two things to intensity on Android: the blur radius (intensity ÷ reduction
            // factor) and a white/black veil (up to ~0.7 × intensity). A low intensity keeps the veil
            // faint so the gradient shows through, and the reduction factor sets the real blur.
            intensity={GLASS_VEIL}
            blurReductionFactor={GLASS_VEIL / Math.max(0.5, theme.glass.blur * GLASS_BLUR)}
            tint={theme.dark ? 'dark' : 'light'}
            style={StyleSheet.absoluteFill}
          />
        ) : null
      ) : null}
      {/* The see-through surface colour on top of the blur. */}
      {glass && backdrop ? <View style={[StyleSheet.absoluteFill, { backgroundColor: withAlpha(theme.colors.surface, (ownOpacity ?? theme.glass.opacity) * GLASS_TINT) }]} /> : null}
      <View style={[styles.inner, innerPadding]}>
        {menu}
        {children}
      </View>
      {extras}
    </View>
  );
}

/** Glass tuning on a real phone (the browser preview blurs and tints differently):
 * GLASS_VEIL — expo-blur intensity, i.e. how strong its own veil is;
 * GLASS_BLUR — blur radius per point of theme.glass.blur (50 → 6);
 * GLASS_TINT — share of the theme's surface opacity drawn over the blur. */
const GLASS_VEIL = 10;
const GLASS_BLUR = 0.12;
const GLASS_TINT = 0.6;

const styles = StyleSheet.create({
  // overflow stays visible for the elevated design, otherwise Android clips its shadow.
  base: {},
  clip: { overflow: 'hidden' },
  clearBg: { backgroundColor: 'transparent' },
  // Fills cards given a fixed size (e.g. the square level card) so their content can centre.
  inner: { flexGrow: 1 },
  menuAnchor: { position: 'absolute', top: 6, right: 6, zIndex: 1 },
});
