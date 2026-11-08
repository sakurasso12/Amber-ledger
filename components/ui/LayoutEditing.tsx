import { createContext, useContext } from 'react';
import type { AnimatedRef } from 'react-native-reanimated';

/**
 * True while a screen's layout is being edited (the pencil). Cards read it to switch their tap
 * from "open" to "change the shape", and to stop normal actions from firing mid-rearrange.
 */
export const LayoutEditingContext = createContext(false);

export const useLayoutEditing = () => useContext(LayoutEditingContext);

/**
 * The screen's scroll view (an Animated one, from useAnimatedRef). Boards hand it to Sortable as
 * `scrollableRef`, so a card dragged to the screen's edge scrolls the page instead of stopping there.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const LayoutScrollContext = createContext<AnimatedRef<any> | undefined>(undefined);

export const useLayoutScroll = () => useContext(LayoutScrollContext);

/** How fast that edge scroll goes at most, px/s (the library's 1000 felt too quick). */
export const LAYOUT_SCROLL_SPEED = 750;
