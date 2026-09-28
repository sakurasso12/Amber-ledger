import React from 'react';
import { ImageBackground, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { useSettingsStore } from '@/store/useSettingsStore';

/** Root container for every screen. When the user has set an app-wide background image (in
 * Settings → Фон приложения), it renders behind the screen with a themed tint overlay so text
 * stays legible; otherwise it's just the plain themed background. */
export function Screen({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const theme = useTheme();
  const backgroundImageUri = useSettingsStore((s) => s.settings.backgroundImageUri);

  if (backgroundImageUri) {
    return (
      <ImageBackground source={{ uri: backgroundImageUri }} style={[styles.flex, style]}>
        <View style={[styles.flex, { backgroundColor: `${theme.colors.background}99` }]}>{children}</View>
      </ImageBackground>
    );
  }

  return <View style={[styles.flex, { backgroundColor: theme.colors.background }, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
