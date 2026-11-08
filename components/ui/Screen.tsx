import React from 'react';
import { ImageBackground, StyleProp, StyleSheet, useWindowDimensions, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useKeyboardHeight } from './useKeyboardHeight';

/** Root container for every screen. When the user has set an app-wide background image (in
 * Settings → Фон приложения), it renders behind the screen with a themed tint overlay so text
 * stays legible; otherwise it's just the plain themed background. While the keyboard is open the
 * screen gets matching bottom padding, so focused inputs stay above it (Android draws edge-to-edge
 * and no longer shrinks the window for the keyboard). */
export function Screen({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const theme = useTheme();
  const backgroundImageUri = useSettingsStore((s) => s.settings.backgroundImageUri);
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

  if (backgroundImageUri) {
    return (
      <ImageBackground source={{ uri: backgroundImageUri }} style={[styles.flex, style]}>
        <View style={[styles.flex, { backgroundColor: `${theme.colors.background}99` }]}>{content}</View>
      </ImageBackground>
    );
  }

  return <View style={[styles.flex, { backgroundColor: theme.colors.background }, style]}>{content}</View>;
}

/** Widest the content gets (phones in landscape, tablets); the background still fills the screen. */
export const MAX_CONTENT_WIDTH = 860;

const styles = StyleSheet.create({
  flex: { flex: 1 },
  column: { width: '100%', maxWidth: MAX_CONTENT_WIDTH, alignSelf: 'center' },
});
