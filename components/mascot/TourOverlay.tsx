import React from 'react';
import { Modal, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';
import { useTranslation } from '@/i18n';
import { useHelpStore } from '@/store/useHelpStore';
import { TymofiiFace } from './Tymofii';

const PAD = 8;
const DIM = 'rgba(0,0,0,0.72)';

/**
 * Тимофій's guided tour (mounted once in app/_layout): the screen dims except a window around the
 * element being explained, and Тимофій explains it next to it. Tap outside or "Got it" to close.
 */
export function TourOverlay() {
  const theme = useTheme();
  const tr = useTranslation();
  const { width: W, height: H } = useWindowDimensions();
  const steps = useHelpStore((s) => s.steps);
  const index = useHelpStore((s) => s.index);
  const rect = useHelpStore((s) => s.rect);
  const next = useHelpStore((s) => s.next);
  const stop = useHelpStore((s) => s.stop);
  const step = steps[index];
  if (!step) return null;

  const hole = rect
    ? {
        x: Math.max(0, rect.x - PAD),
        y: Math.max(0, rect.y - PAD),
        w: Math.min(W, rect.width + PAD * 2),
        h: rect.height + PAD * 2,
      }
    : null;
  const last = index + 1 >= steps.length;
  // Explanation under the spotlight when it's in the top half, above it otherwise.
  const below = hole ? hole.y + hole.h / 2 < H / 2 : false;
  const panelPos = !hole
    ? { top: H * 0.3 }
    : below
      ? { top: Math.min(H - 260, hole.y + hole.h + 14) }
      : { bottom: Math.min(H - 260, H - hole.y + 14) };

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent navigationBarTranslucent onRequestClose={stop}>
      {hole ? (
        <>
          <Pressable onPress={stop} style={[styles.dim, { left: 0, top: 0, width: W, height: hole.y }]} />
          <Pressable onPress={stop} style={[styles.dim, { left: 0, top: hole.y + hole.h, width: W, height: Math.max(0, H - hole.y - hole.h) }]} />
          <Pressable onPress={stop} style={[styles.dim, { left: 0, top: hole.y, width: hole.x, height: hole.h }]} />
          <Pressable onPress={stop} style={[styles.dim, { left: hole.x + hole.w, top: hole.y, width: Math.max(0, W - hole.x - hole.w), height: hole.h }]} />
          <View pointerEvents="none" style={[styles.ring, { left: hole.x, top: hole.y, width: hole.w, height: hole.h, borderColor: theme.colors.accent }]} />
        </>
      ) : (
        <Pressable onPress={stop} style={[styles.dim, StyleSheet.absoluteFill]} />
      )}

      <View style={[styles.panel, panelPos]}>
        <TymofiiFace mood="wink" prop={null} size={84} />
        <View style={[styles.bubble, { backgroundColor: theme.colors.surface, borderColor: theme.colors.accent }]}>
          <Text style={[styles.title, { color: theme.colors.text }]}>{step.title}</Text>
          <Text style={[styles.text, { color: theme.colors.textMuted }]}>{step.text}</Text>
          <View style={styles.row}>
            <Text style={[styles.counter, { color: theme.colors.textMuted }]}>{steps.length > 1 ? tr.help.stepOf(index + 1, steps.length) : ''}</Text>
            <Button title={last ? tr.help.gotIt : tr.help.next} onPress={() => (last ? stop() : next())} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  dim: { position: 'absolute', backgroundColor: DIM },
  ring: { position: 'absolute', borderWidth: 2, borderRadius: 18 },
  panel: { position: 'absolute', left: 12, right: 12, flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  bubble: { flex: 1, borderWidth: 1, borderRadius: 18, borderBottomLeftRadius: 4, padding: 14, gap: 8 },
  title: { fontSize: 16, fontWeight: '800' },
  text: { fontSize: 14, lineHeight: 20 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  counter: { fontSize: 12, fontWeight: '700' },
});
