import { createContext } from 'react';

/** The grid widget a card belongs to: lets its ⋮ remove it from the screen in the simple mode. */
export const GridItemContext = createContext<{ remove?: () => void } | null>(null);
