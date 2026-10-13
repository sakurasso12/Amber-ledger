import React, { useEffect, useRef, useState } from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useTheme } from '@/theme/ThemeProvider';
import { haptics } from '@/lib/haptics';
import { useTranslation } from '@/i18n';
import { Button } from './Button';
import { Text } from './Text';

const SECONDS = 10;

/**
 * Last chance before erasing everything: counts 0 → 10 while a red bar fills; Cancel stops it.
 * `run()` resolves true when the count reaches 10, false when cancelled. Render `countdown`.
 */
export function useEraseCountdown() {
  const theme = useTheme();
  const tr = useTranslation();
  const [visible, setVisible] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const resolver = useRef<((ok: boolean) => void) | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const progress = useSharedValue(0);

  function finish(ok: boolean) {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    cancelAnimation(progress);
    setVisible(false);
    resolver.current?.(ok);
    resolver.current = null;
  }

  function run(): Promise<boolean> {
    setSeconds(0);
    progress.value = 0;
    setVisible(true);
    progress.value = withTiming(1, { duration: SECONDS * 1000, easing: Easing.linear });
    let elapsed = 0;
    timer.current = setInterval(() => {
      elapsed += 1;
      setSeconds(elapsed);
      haptics.tap();
      if (elapsed >= SECONDS) finish(true);
    }, 1000);
    return new Promise((resolve) => {
      resolver.current = resolve;
    });
  }

  useEffect(() => () => {
    if (timer.current) clearInterval(timer.current);
  }, []);

  const barStyle = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));

  const countdown = (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => finish(false)}>
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.danger }]}>
          <Text style={[styles.title, { color: theme.colors.text }]}>{tr.storage.countdown}</Text>
          <Text style={[styles.number, { color: theme.colors.danger }]}>{seconds}</Text>
          <View style={[styles.track, { backgroundColor: `${theme.colors.danger}22` }]}>
            <Animated.View style={[styles.fill, { backgroundColor: theme.colors.danger }, barStyle]} />
          </View>
          <Text style={[styles.hint, { color: theme.colors.textMuted }]}>{tr.storage.countdownHint}</Text>
          <Button title={tr.storage.cancel} variant="secondary" onPress={() => finish(false)} />
        </View>
      </View>
    </Modal>
  );

  return { run, countdown };
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', padding: 24 },
  card: { borderRadius: 22, borderWidth: 1.5, padding: 22, gap: 14, alignItems: 'stretch' },
  title: { fontSize: 17, fontWeight: '800', textAlign: 'center' },
  number: { fontSize: 64, fontWeight: '800', textAlign: 'center', fontVariant: ['tabular-nums'] },
  track: { height: 12, borderRadius: 6, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 6 },
  hint: { fontSize: 13, textAlign: 'center' },
});
