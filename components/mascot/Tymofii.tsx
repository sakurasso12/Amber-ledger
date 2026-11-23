import React from 'react';
import { Image, StyleSheet, View, ViewStyle } from 'react-native';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/theme/ThemeProvider';
import { useSettingsStore } from '@/store/useSettingsStore';

/**
 * Тимофій — the app's mascot (same ash-grey cat as the icon). Pure vector, so it stays sharp at
 * any size and costs nothing to render. `mood` changes eyes/mouth, `prop` adds a small item.
 */
export type TymofiiMood = 'happy' | 'calm' | 'open' | 'wink' | 'worried' | 'sad' | 'stars' | 'sleep';
export type TymofiiProp = 'coin' | 'emptyCoin' | 'coins' | 'note' | 'flame' | 'party' | 'sweat' | 'zzz' | 'bell' | 'question' | null;

/**
 * Pre-rendered PNGs (one per mood + item, generated from the same vector art). Bitmaps instead of
 * live SVG: Android draws them almost for free, so screen/popup animations stay at 120 Hz even with
 * several Тимофіїв on screen. Missing combo → the mood without the item → happy.
 */
const IMAGES: Record<string, number> = {
  'calm-none': require('@/assets/mascot/calm-none.png'),
  'calm-note': require('@/assets/mascot/calm-note.png'),
  'happy-coin': require('@/assets/mascot/happy-coin.png'),
  'happy-none': require('@/assets/mascot/happy-none.png'),
  'happy-party': require('@/assets/mascot/happy-party.png'),
  'open-bell': require('@/assets/mascot/open-bell.png'),
  'open-coin': require('@/assets/mascot/open-coin.png'),
  'open-none': require('@/assets/mascot/open-none.png'),
  'sad-emptyCoin': require('@/assets/mascot/sad-emptyCoin.png'),
  'sad-none': require('@/assets/mascot/sad-none.png'),
  'sleep-none': require('@/assets/mascot/sleep-none.png'),
  'sleep-zzz': require('@/assets/mascot/sleep-zzz.png'),
  'stars-coins': require('@/assets/mascot/stars-coins.png'),
  'stars-none': require('@/assets/mascot/stars-none.png'),
  'stars-party': require('@/assets/mascot/stars-party.png'),
  'wink-none': require('@/assets/mascot/wink-none.png'),
  'wink-question': require('@/assets/mascot/wink-question.png'),
  'worried-none': require('@/assets/mascot/worried-none.png'),
  'worried-sweat': require('@/assets/mascot/worried-sweat.png'),
};

export function TymofiiFace({ mood = 'happy', prop = null, size = 84 }: { mood?: TymofiiMood; prop?: TymofiiProp; size?: number }) {
  const source = IMAGES[`${mood}-${prop ?? 'none'}`] ?? IMAGES[`${mood}-none`] ?? IMAGES['happy-none'];
  return (
    <Image
      source={source}
      style={{ width: size, height: size }}
      resizeMode="contain"
      fadeDuration={0}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    />
  );
}

/** Is the mascot switched on (Settings → Sounds & Тимофій)? */
/** Тимофій on cards, bubbles and sounds — off in the simple mode (it's noise there). */
export function useMascotOn(): boolean {
  return useSettingsStore((s) => s.settings.mascotEnabled && s.settings.uiMode !== 'simple');
}

/** The simple mode (1.8): fewer menus, no layout editing, no extras. */
export function useSimpleMode(): boolean {
  return useSettingsStore((s) => s.settings.uiMode === 'simple');
}

/** Тимофій with an optional speech bubble, for cards. Renders nothing when the mascot is off. */
export function Tymofii({
  mood = 'happy',
  prop = null,
  size = 72,
  say,
  style,
}: {
  mood?: TymofiiMood;
  prop?: TymofiiProp;
  size?: number;
  say?: string;
  style?: ViewStyle;
}) {
  const theme = useTheme();
  const on = useMascotOn();
  if (!on) return null;
  return (
    <View style={[styles.row, style]}>
      {say ? (
        <View style={[styles.bubble, { backgroundColor: theme.colors.surfaceAlt, borderColor: theme.colors.border }]}>
          <Text style={[styles.say, { color: theme.colors.text }]} numberOfLines={2}>
            {say}
          </Text>
        </View>
      ) : null}
      <TymofiiFace mood={mood} prop={prop} size={size} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bubble: { flexShrink: 1, borderWidth: 1, borderRadius: 14, borderBottomRightRadius: 4, paddingHorizontal: 10, paddingVertical: 6 },
  say: { fontSize: 12, fontWeight: '700', lineHeight: 16 },
});
