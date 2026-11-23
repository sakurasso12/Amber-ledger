import { createContext } from 'react';

/** Height (px) a widget's card should stretch to — its box on the widget grid — or null outside it. */
export const GridCellContext = createContext<number | null>(null);
