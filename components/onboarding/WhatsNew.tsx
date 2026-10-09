import React, { useRef } from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useTranslation } from '@/i18n';
import { TourCards, TourSlide } from './TourCards';

/** The installed app version (from app.json). */
export const APP_VERSION = Constants.expoConfig?.version ?? '0';

/** Icons for each version's cards, in the order of tr.whatsNew.releases[version]. */
const ICONS: Record<string, (keyof typeof Ionicons.glyphMap)[]> = {
  '1.2.0': ['gift-outline', 'flame', 'ellipse-outline', 'move-outline', 'apps-outline'],
};

/**
 * After an update: the app dims and a few cards show what's new in this version — once per
 * version, and only for people who already use the app (a fresh install gets the first-launch
 * setup instead, which marks the version as seen).
 */
export function WhatsNew() {
  const tr = useTranslation();
  const insets = useSafeAreaInsets();
  const onboardingDone = useSettingsStore((s) => s.settings.onboardingDone);
  const lastSeen = useSettingsStore((s) => s.settings.lastSeenVersion);
  const updateSettings = useSettingsStore((s) => s.updateSettings);
  const backRef = useRef<(() => boolean) | null>(null);

  const release = tr.whatsNew.releases[APP_VERSION];
  const visible = onboardingDone && lastSeen !== APP_VERSION && !!release;
  if (!release) return null;

  const slides: TourSlide[] = release.map((slide, i) => ({ ...slide, icon: ICONS[APP_VERSION]?.[i] }));
  const close = () => updateSettings({ lastSeenVersion: APP_VERSION });

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent navigationBarTranslucent onRequestClose={() => backRef.current?.()}>
      <View style={[styles.backdrop, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 16 }]}>
        <TourCards slides={slides} finishLabel={tr.whatsNew.done} backRef={backRef} onFinish={close} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.62)' },
});
