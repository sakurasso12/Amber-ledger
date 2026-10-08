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

const EASE = Easing.inOut(Easing.quad);

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
    // Jelly: stretch wide and flat, then tall and thin, settling in smaller wobbles.
    const step = (value: number, duration: number) => withTiming(value, { duration, easing: EASE });
    scaleX.value = withSequence(step(1.08, 110), step(0.95, 110), step(1.03, 100), step(0.99, 90), step(1, 80));
    scaleY.value = withSequence(step(0.92, 110), step(1.05, 110), step(0.98, 100), step(1.01, 90), step(1, 80));
  }, [dropCount, scaleX, scaleY]);

  const animated = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotate.value}deg` }, { scaleX: scaleX.value }, { scaleY: scaleY.value }],
  }));

  return <Animated.View style={[style, animated]}>{children}</Animated.View>;
}
