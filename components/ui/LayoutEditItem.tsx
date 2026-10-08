import React, { useEffect } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSettingsStore } from '@/store/useSettingsStore';

const EASE = Easing.inOut(Easing.quad);
// The jelly squashes with ease-in: slow start, quick snap into each wobble.
const JELLY_EASE = Easing.in(Easing.quad);

/**
 * Whether a board still needs the "you can drag these" sway — per board, so each screen shows it
 * until something has been dragged there. `markSeen` goes in the board's drag-end handler.
 */
export function useLayoutHint(boardId: string) {
  const seen = useSettingsStore((s) => s.settings.layoutHintsSeen.includes(boardId));
  const markSeen = () => {
    const { settings, updateSettings } = useSettingsStore.getState();
    if (!settings.layoutHintsSeen.includes(boardId)) updateSettings({ layoutHintsSeen: [...settings.layoutHintsSeen, boardId] });
  };
  return { showHint: !seen, markSeen };
}

/**
 * Sortable.Flex reports an item's key the way React.Children.toArray stores it (".$balance");
 * strip that prefix to get back the key we gave the item.
 */
export const droppedKey = (key: string) => key.replace(/^\.\$/, '');

interface LayoutEditItemProps {
  children: React.ReactNode;
  /** Sway side to side for a couple of seconds — "these can be moved" when edit mode opens. */
  hint?: boolean;
  /** Bumped every time this item is dropped; each bump plays the jelly wobble. */
  dropCount?: number;
  style?: StyleProp<ViewStyle>;
}

/** Wraps a module in an editable layout: the hint sway and the jelly settle after a drop. */
export function LayoutEditItem({ children, hint = false, dropCount = 0, style }: LayoutEditItemProps) {
  const rotate = useSharedValue(0);
  const scaleX = useSharedValue(1);
  const scaleY = useSharedValue(1);

  useEffect(() => {
    if (!hint) {
      cancelAnimation(rotate);
      rotate.value = withTiming(0, { duration: 120, easing: EASE });
      return;
    }
    // ~2.5 s of gentle swaying, then back to straight.
    rotate.value = withSequence(
      withRepeat(withSequence(withTiming(-2.2, { duration: 150, easing: EASE }), withTiming(2.2, { duration: 150, easing: EASE })), 8),
      withTiming(0, { duration: 150, easing: EASE })
    );
  }, [hint, rotate]);

  useEffect(() => {
    if (dropCount === 0) return;
    // Jelly: stretch wide and flat, then tall and thin, settling in smaller and smaller wobbles.
    const step = (value: number, duration: number) => withTiming(value, { duration, easing: JELLY_EASE });
    scaleX.value = withSequence(step(1.12, 120), step(0.9, 130), step(1.06, 120), step(0.97, 110), step(1.01, 100), step(1, 90));
    scaleY.value = withSequence(step(0.88, 120), step(1.1, 130), step(0.95, 120), step(1.03, 110), step(0.99, 100), step(1, 90));
  }, [dropCount, scaleX, scaleY]);

  const animated = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotate.value}deg` }, { scaleX: scaleX.value }, { scaleY: scaleY.value }],
  }));

  return <Animated.View style={[style, animated]}>{children}</Animated.View>;
}
