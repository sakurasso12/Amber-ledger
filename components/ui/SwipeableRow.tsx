import React, { useRef } from 'react';
import { Animated, PanResponder, StyleSheet, View } from 'react-native';
import { haptics } from '@/lib/haptics';

interface SwipeAction {
  icon: React.ReactNode;
  color: string;
  onTrigger: () => void;
}

interface SwipeableRowProps {
  children: React.ReactNode;
  /** Dragging the row to the right reveals this action (e.g. mark done). */
  rightAction?: SwipeAction;
  /** Dragging the row to the left reveals this action (e.g. delete). */
  leftAction?: SwipeAction;
}

const THRESHOLD = 88;

/** Swipe-to-act row, built on the core Animated + PanResponder APIs — no gesture-handler /
 * reanimated dependency needed for a single-axis drag like this. */
export function SwipeableRow({ children, rightAction, leftAction }: SwipeableRowProps) {
  const translateX = useRef(new Animated.Value(0)).current;
  const dragX = useRef(0);
  const pastThreshold = useRef(false);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) =>
        Math.abs(gesture.dx) > 12 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.5,
      onPanResponderMove: (_, gesture) => {
        let dx = gesture.dx;
        if (dx > 0 && !rightAction) dx = 0;
        if (dx < 0 && !leftAction) dx = 0;
        dragX.current = dx;
        translateX.setValue(dx);

        const isPast = Math.abs(dx) > THRESHOLD;
        if (isPast !== pastThreshold.current) {
          pastThreshold.current = isPast;
          haptics.tap();
        }
      },
      onPanResponderRelease: () => {
        const dx = dragX.current;
        if (dx > THRESHOLD && rightAction) {
          haptics.success();
          rightAction.onTrigger();
        } else if (dx < -THRESHOLD && leftAction) {
          haptics.warning();
          leftAction.onTrigger();
        }
        pastThreshold.current = false;
        Animated.spring(translateX, { toValue: 0, useNativeDriver: true, bounciness: 6 }).start();
      },
      onPanResponderTerminate: () => {
        pastThreshold.current = false;
        Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
      },
    })
  ).current;

  const rightOpacity = translateX.interpolate({ inputRange: [0, THRESHOLD], outputRange: [0, 1], extrapolate: 'clamp' });
  const leftOpacity = translateX.interpolate({ inputRange: [-THRESHOLD, 0], outputRange: [1, 0], extrapolate: 'clamp' });

  return (
    <View style={styles.wrapper}>
      {rightAction ? (
        <Animated.View style={[styles.actionLayer, styles.rightLayer, { backgroundColor: rightAction.color, opacity: rightOpacity }]}>
          {rightAction.icon}
        </Animated.View>
      ) : null}
      {leftAction ? (
        <Animated.View style={[styles.actionLayer, styles.leftLayer, { backgroundColor: leftAction.color, opacity: leftOpacity }]}>
          {leftAction.icon}
        </Animated.View>
      ) : null}
      <Animated.View style={{ transform: [{ translateX }] }} {...panResponder.panHandlers}>
        {children}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { position: 'relative' },
  actionLayer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    borderRadius: 14,
    justifyContent: 'center',
  },
  rightLayer: { alignItems: 'flex-start', paddingLeft: 22 },
  leftLayer: { alignItems: 'flex-end', paddingRight: 22 },
});
