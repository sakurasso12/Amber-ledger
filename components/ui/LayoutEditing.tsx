import { createContext, useContext } from 'react';

/**
 * True while a screen's layout is being edited (the pencil). Cards read it to switch their tap
 * from "open" to "change the shape", and to stop normal actions from firing mid-rearrange.
 */
export const LayoutEditingContext = createContext(false);

export const useLayoutEditing = () => useContext(LayoutEditingContext);
