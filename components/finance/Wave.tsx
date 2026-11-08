import React from 'react';
import { Path } from 'react-native-svg';
import Animated, { Easing, useAnimatedProps, type SharedValue } from 'react-native-reanimated';

const AnimatedPath = Animated.createAnimatedComponent(Path);

export const BAR_HEIGHT = 68;
/** How far the wave's crest swings left and right of the fill line, in points. */
const AMPLITUDE = 5;
/** Two full waves over the bar's height. */
const WAVES = 2;
export const FILL = { duration: 900, easing: Easing.inOut(Easing.cubic) };

/**
 * The filled part of the bar, its right edge a wave that keeps rolling. `fill` is 0–1 of the
 * width; `phase` rolls the wave along.
 */
export function Wave({ width, fill, phase, offset, color, opacity }: {
  width: number;
  fill: SharedValue<number>;
  phase: SharedValue<number>;
  offset: number;
  color: string;
  opacity: number;
}) {
  const props = useAnimatedProps(() => {
    const edge = fill.value * width;
    // The wave flattens out near 0 % and 100 % so the bar doesn't bulge past its ends.
    const amplitude = Math.min(AMPLITUDE, edge / 2, (width - edge) / 2);
    if (edge <= 0.5) return { d: 'M 0 0' };
    let d = `M 0 0 L ${edge + amplitude * Math.sin(phase.value + offset)} 0`;
    for (let y = 4; y <= BAR_HEIGHT; y += 4) {
      const x = edge + amplitude * Math.sin((y / BAR_HEIGHT) * WAVES * 2 * Math.PI + phase.value + offset);
      d += ` L ${x} ${y}`;
    }
    return { d: `${d} L 0 ${BAR_HEIGHT} Z` };
  });
  return <AnimatedPath animatedProps={props} fill={color} fillOpacity={opacity} />;
}
