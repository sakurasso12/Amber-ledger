import React, { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useAudioPlayer } from 'expo-audio';
import { useTheme } from '@/theme/ThemeProvider';
import { useTaskStore } from '@/store/useTaskStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { completedCount, levelLabel, levelOf, segmentsFilled, TASKS_PER_LEVEL } from '@/lib/level';
import { haptics } from '@/lib/haptics';
import { CustomizableCard, Text } from '@/components/ui';
import { useTranslation } from '@/i18n';

const AnimatedPath = Animated.createAnimatedComponent(Path);

/** Gap between segments, in degrees. */
const GAP = 7;
const SEGMENT = 360 / TASKS_PER_LEVEL;
const FILL = { duration: 750, easing: Easing.inOut(Easing.cubic) };

/** SVG arc from `fromDeg` to `toDeg` (0° = top, clockwise) on a circle of radius r around c. */
function arc(c: number, r: number, fromDeg: number, toDeg: number): string {
  'worklet';
  if (toDeg - fromDeg < 0.01) return `M ${c} ${c}`;
  const point = (deg: number) => {
    const rad = ((deg - 90) * Math.PI) / 180;
    return `${c + r * Math.cos(rad)} ${c + r * Math.sin(rad)}`;
  };
  return `M ${point(fromDeg)} A ${r} ${r} 0 ${toDeg - fromDeg > 180 ? 1 : 0} 1 ${point(toDeg)}`;
}

/** One ring segment, filled up to how far `progress` (0–10) has reached into it. */
function FilledSegment({ index, progress, c, r, stroke, color }: { index: number; progress: SharedValue<number>; c: number; r: number; stroke: number; color: string }) {
  const start = index * SEGMENT + GAP / 2;
  const length = SEGMENT - GAP;
  const props = useAnimatedProps(() => {
    const fraction = Math.min(1, Math.max(0, progress.value - index));
    return { d: arc(c, r, start, start + fraction * length) };
  });
  return <AnimatedPath animatedProps={props} stroke={color} strokeWidth={stroke} strokeLinecap="round" fill="none" />;
}

/**
 * Square in the Tasks grid: all tasks ever done as a ring of 10 segments. Every 10th task fills
 * the ring — the level-up sound plays and it starts over ("10/20", "20/30"…).
 */
export function LevelCard({ size }: { size: number }) {
  const theme = useTheme();
  const tr = useTranslation();
  const tasks = useTaskStore((s) => s.tasks);
  const soundOn = useSettingsStore((s) => s.settings.soundEffects);
  const total = useMemo(() => completedCount(tasks), [tasks]);
  const player = useAudioPlayer(require('@/assets/sounds/level-up.mp3'));

  const progress = useSharedValue(segmentsFilled(total));
  const pulse = useSharedValue(1);
  const previous = useRef(total);

  function levelUp() {
    haptics.success();
    if (soundOn) {
      player.seekTo(0);
      player.play();
    }
  }

  useEffect(() => {
    const before = previous.current;
    previous.current = total;
    if (total === before) return;
    const target = segmentsFilled(total);

    if (total > before && levelOf(total) > levelOf(before)) {
      // Finish the ring, celebrate, then start the next one from empty.
      progress.value = withTiming(TASKS_PER_LEVEL, FILL, (finished) => {
        if (!finished) return;
        scheduleOnRN(levelUp);
        pulse.value = withSequence(withTiming(1.12, { duration: 140 }), withSpring(1, { stiffness: 250, damping: 12 }));
        progress.value = withSequence(withTiming(0, { duration: 1 }), withTiming(target, FILL));
      });
    } else {
      progress.value = withTiming(target, FILL);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total]);

  const ringStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));

  const ring = size * 0.6;
  const stroke = ring * 0.11;
  const c = ring / 2;
  const r = c - stroke / 2 - 1;

  return (
    <CustomizableCard widgetId="tasks-level" style={{ width: size, height: size }}>
      <View style={styles.content}>
        <Animated.View style={[{ width: ring, height: ring }, ringStyle]}>
          <Svg width={ring} height={ring}>
            {Array.from({ length: TASKS_PER_LEVEL }, (_, i) => (
              <Path
                key={`bg${i}`}
                d={arc(c, r, i * SEGMENT + GAP / 2, (i + 1) * SEGMENT - GAP / 2)}
                stroke={theme.colors.border}
                strokeWidth={stroke}
                strokeLinecap="round"
                fill="none"
              />
            ))}
            {Array.from({ length: TASKS_PER_LEVEL }, (_, i) => (
              <FilledSegment key={`fg${i}`} index={i} progress={progress} c={c} r={r} stroke={stroke} color={theme.colors.primary} />
            ))}
          </Svg>
          <View style={[StyleSheet.absoluteFill, styles.center]}>
            <Text style={[styles.count, { color: theme.colors.text, fontSize: ring * 0.2 }]} numberOfLines={1} adjustsFontSizeToFit>
              {levelLabel(total)}
            </Text>
          </View>
        </Animated.View>
        <Text style={[styles.label, { color: theme.colors.textMuted }]} numberOfLines={1}>
          {tr.level.tasksDone}
        </Text>
      </View>
    </CustomizableCard>
  );
}

const styles = StyleSheet.create({
  content: { alignItems: 'center', justifyContent: 'center', gap: 6, flexGrow: 1 },
  center: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  count: { fontWeight: '800', fontVariant: ['tabular-nums'] },
  label: { fontSize: 12, fontWeight: '700' },
});
