import { create } from 'zustand';

/**
 * How many widget boards are in edit mode right now. While any is, the tab pager stops swiping —
 * otherwise dragging a widget sideways flipped the screen to the next tab.
 */
export const useLayoutEditStore = create<{ count: number; enter: () => void; leave: () => void }>()((set) => ({
  count: 0,
  enter: () => set((s) => ({ count: s.count + 1 })),
  leave: () => set((s) => ({ count: Math.max(0, s.count - 1) })),
}));
