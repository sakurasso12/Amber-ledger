import React, { useRef } from 'react';
import { Animated, GestureResponderEvent, Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';
import { SPRING_PRESS } from '@/theme/motion';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface PressableScaleProps extends Omit<PressableProps, 'style'> {
  style?: StyleProp<ViewStyle>;
  /** How far the element shrinks while held (1 = not at all). */
  scaleTo?: number;
}

/** A Pressable that sinks slightly under the finger and springs back, like iOS buttons and cells. */
export function PressableScale({ style, scaleTo = 0.97, onPressIn, onPressOut, ...rest }: PressableScaleProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const springTo = (toValue: number) => Animated.spring(scale, { toValue, ...SPRING_PRESS, useNativeDriver: true }).start();

  return (
    <AnimatedPressable
      {...rest}
      onPressIn={(e: GestureResponderEvent) => {
        springTo(scaleTo);
        onPressIn?.(e);
      }}
      onPressOut={(e: GestureResponderEvent) => {
        springTo(1);
        onPressOut?.(e);
      }}
      style={[style, { transform: [{ scale }] }]}
    />
  );
}
