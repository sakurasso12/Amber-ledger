import { useEffect, useRef } from 'react';
import type { View } from 'react-native';
import { Rect, useHelpStore } from '@/store/useHelpStore';

/**
 * Lets Тимофій's tour find this element: put the returned ref on its root View/Pressable.
 * `id` like 'finance.fab' — see components/mascot/helpTopics.ts.
 */
export function useHelpTarget<T extends View = View>(id: string | undefined) {
  const ref = useRef<T>(null);
  useEffect(() => {
    if (!id) return;
    const measure = () =>
      new Promise<Rect | null>((resolve) => {
        const node = ref.current;
        if (!node) return resolve(null);
        node.measureInWindow((x, y, width, height) => resolve({ x, y, width, height }));
      });
    return useHelpStore.getState().register(id, measure);
  }, [id]);
  return ref;
}
