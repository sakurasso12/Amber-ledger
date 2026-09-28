import React, { useRef, useState } from 'react';
import { Animated, LayoutAnimation, PanResponderInstance, PanResponder, StyleSheet, View } from 'react-native';
import { haptics } from '@/lib/haptics';

interface ReorderableListProps<T> {
  items: T[];
  keyExtractor: (item: T) => string;
  /** Fixed row height (excluding `gap`) — every row must render at exactly this height, since
   * position math is index * (itemHeight + gap) rather than measured per-item layout. */
  itemHeight: number;
  gap?: number;
  onReorder: (items: T[]) => void;
  /** `dragHandleProps` is a PanResponder's `panHandlers` — spread it onto whatever should act as
   * the drag handle (e.g. a "⠿" icon), not necessarily the whole row. */
  renderItem: (item: T, dragHandleProps: PanResponderInstance['panHandlers'], isDragging: boolean) => React.ReactNode;
}

/** Vertical drag-to-reorder list built on PanResponder + Animated + LayoutAnimation — no
 * gesture-handler/reanimated dependency, consistent with SwipeableRow. Rows must all share
 * `itemHeight` (pass a compact/fixed-height row renderer while reordering is active) since the
 * layout math assumes uniform row height rather than measuring each row. */
export function ReorderableList<T>({ items, keyExtractor, itemHeight, gap = 8, onReorder, renderItem }: ReorderableListProps<T>) {
  const rowHeight = itemHeight + gap;
  const [draggingKey, setDraggingKey] = useState<string | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const dragY = useRef(new Animated.Value(0)).current;
  const startIndexRef = useRef(0);

  function makeResponder(key: string, index: number) {
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 4,
      onPanResponderGrant: () => {
        haptics.tap();
        startIndexRef.current = index;
        setDraggingKey(key);
        setHoverIndex(index);
        dragY.setValue(0);
      },
      onPanResponderMove: (_, gesture) => {
        dragY.setValue(gesture.dy);
        const rawIndex = startIndexRef.current + Math.round(gesture.dy / rowHeight);
        const clamped = Math.max(0, Math.min(items.length - 1, rawIndex));
        setHoverIndex((prev) => {
          if (prev === clamped) return prev;
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          return clamped;
        });
      },
      onPanResponderRelease: () => {
        const from = startIndexRef.current;
        const to = hoverIndex ?? from;
        if (from !== to) {
          const next = [...items];
          const [moved] = next.splice(from, 1);
          next.splice(to, 0, moved);
          onReorder(next);
        }
        haptics.impact();
        setDraggingKey(null);
        setHoverIndex(null);
        dragY.setValue(0);
      },
      onPanResponderTerminate: () => {
        setDraggingKey(null);
        setHoverIndex(null);
        dragY.setValue(0);
      },
    });
  }

  const originalIndex = draggingKey ? items.findIndex((it) => keyExtractor(it) === draggingKey) : -1;
  let displayItems = items;
  if (draggingKey !== null && hoverIndex !== null && originalIndex !== -1) {
    displayItems = [...items];
    const [moved] = displayItems.splice(originalIndex, 1);
    displayItems.splice(hoverIndex, 0, moved);
  }

  return (
    <View style={{ height: Math.max(0, rowHeight * items.length - gap) }}>
      {displayItems.map((item, displayIndex) => {
        const key = keyExtractor(item);
        const isDragging = key === draggingKey;
        const realIndex = items.findIndex((it) => keyExtractor(it) === key);

        return (
          <Animated.View
            key={key}
            style={[
              styles.row,
              { top: displayIndex * rowHeight, height: itemHeight },
              isDragging && { transform: [{ translateY: dragY }], zIndex: 10, elevation: 6 },
            ]}
          >
            {renderItem(item, makeResponder(key, realIndex).panHandlers, isDragging)}
          </Animated.View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { position: 'absolute', left: 0, right: 0 },
});
