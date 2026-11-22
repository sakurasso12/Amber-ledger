import React, { createContext, useContext, useRef } from 'react';
import { Image, StyleProp, StyleSheet, useWindowDimensions, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurTargetView } from 'expo-blur';
import { useTheme } from '@/theme/ThemeProvider';
import { backdropImage, withAlpha } from '@/theme/theme';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useKeyboardHeight } from './useKeyboardHeight';

/**
 * What glass cards blur: the screen's background (photo or theme gradient). Null when the screen
 * has a plain colour — glass then is just see-through, there's nothing to blur.
 */
const BackdropContext = createContext<React.RefObject<View | null> | null>(null);
export const useBackdrop = () => useContext(BackdropContext);
/** True inside a BackdropHost: the background is already drawn behind, screens stay see-through. */
const BackdropHostContext = createContext(false);

/** The theme's gradient (or the user's photo) as one layer, wrapped in the BlurTargetView that glass
 * cards blur. Null when the screen is a plain colour. */
function useBackdropLayer(backdropRef: React.RefObject<View | null>): React.ReactElement | null {
  const theme = useTheme();
  const backgroundImageUri = useSettingsStore((s) => s.settings.backgroundImageUri);
  const gradient = backgroundImageUri ? null : backdropImage(theme);
  if (!backgroundImageUri && !gradient) return null;
  return (
    <BlurTargetView ref={backdropRef} style={StyleSheet.absoluteFill} pointerEvents="none">
      {backgroundImageUri ? (
        <>
          <Image source={{ uri: backgroundImageUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: `${theme.colors.background}99` }]} />
        </>
      ) : (
        <>
          <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.colors.background, experimental_backgroundImage: gradient ?? undefined }]} />
          {theme.backdrop.dim > 0 ? (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: withAlpha(theme.colors.background, theme.backdrop.dim) }]} />
          ) : null}
        </>
      )}
    </BlurTargetView>
  );
}

/**
 * Draws the background once for a whole navigator (the main tabs), so it also runs behind the tab
 * bar — a floating bar then sits on the gradient instead of a black strip — and every screen inside
 * stays see-through on top of one continuous gradient.
 */
export function BackdropHost({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  const backdropRef = useRef<View | null>(null);
  const layer = useBackdropLayer(backdropRef);
  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.background }]}>
      {layer}
      <BackdropHostContext.Provider value={true}>
        <BackdropContext.Provider value={layer ? backdropRef : null}>{children}</BackdropContext.Provider>
      </BackdropHostContext.Provider>
    </View>
  );
}

/** Root container for every screen. Behind it: the user's background photo (Settings → Фон) with a
 * themed veil, or else the theme's gradient (the vivid colour finish) — unless a BackdropHost already
 * draws it (the main tabs). While the keyboard is open the screen gets matching bottom padding, so
 * focused inputs stay above it (Android draws edge-to-edge and no longer shrinks the window). */
export function Screen({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const theme = useTheme();
  const inHost = useContext(BackdropHostContext);
  const backdropRef = useRef<View | null>(null);
  const ownLayer = useBackdropLayer(backdropRef);
  // An inner wrapper (not padding on the root) so absolutely positioned children — the + button,
  // the quick-add bar — move up with the keyboard too.
  const keyboardHeight = useKeyboardHeight();
  // Landscape: keep clear of the side the camera cut-out / navigation buttons moved to, and hold the
  // content to a readable column instead of stretching cards across the whole width.
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const wide = width - insets.left - insets.right > MAX_CONTENT_WIDTH;
  const content = (
    <View style={[styles.flex, { marginBottom: keyboardHeight, paddingLeft: insets.left, paddingRight: insets.right }]}>
      <View style={[styles.flex, wide && styles.column]}>{children}</View>
    </View>
  );

  // Inside the tabs the background is already behind everything (BackdropHost).
  if (inHost) return <View style={[styles.flex, style]}>{content}</View>;

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.background }, style]}>
      {ownLayer}
      <BackdropContext.Provider value={ownLayer ? backdropRef : null}>{content}</BackdropContext.Provider>
    </View>
  );
}

/** Widest the content gets (phones in landscape, tablets); the background still fills the screen. */
export const MAX_CONTENT_WIDTH = 860;

const styles = StyleSheet.create({
  flex: { flex: 1 },
  column: { width: '100%', maxWidth: MAX_CONTENT_WIDTH, alignSelf: 'center' },
});
