import { create } from 'zustand';

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TourStep {
  /** A registered target (useHelpTarget); null = no spotlight, Тимофій talks in the middle. */
  target: string | null;
  title: string;
  text: string;
}

interface HelpState {
  /** Measures a target's position on screen right now (registered by useHelpTarget). */
  measurers: Record<string, () => Promise<Rect | null>>;
  steps: TourStep[];
  index: number;
  /** Where the current step's target is (null = not on screen / no target). */
  rect: Rect | null;
  register: (id: string, measure: () => Promise<Rect | null>) => () => void;
  start: (steps: TourStep[]) => Promise<void>;
  next: () => Promise<void>;
  stop: () => void;
}

async function measureStep(step: TourStep | undefined): Promise<Rect | null> {
  if (!step?.target) return null;
  const m = useHelpStore.getState().measurers[step.target];
  if (!m) return null;
  const r = await m();
  // Off-screen or not laid out → treat as no target.
  return r && r.width > 0 && r.height > 0 ? r : null;
}

/** Тимофій's guided tour: dims the screen and puts a spotlight on the thing being explained. */
export const useHelpStore = create<HelpState>()((set, get) => ({
  measurers: {},
  steps: [],
  index: 0,
  rect: null,
  register: (id, measure) => {
    set((s) => ({ measurers: { ...s.measurers, [id]: measure } }));
    return () =>
      set((s) => {
        if (s.measurers[id] !== measure) return s;
        const { [id]: _gone, ...rest } = s.measurers;
        return { measurers: rest };
      });
  },
  start: async (steps) => {
    const rect = await measureStep(steps[0]);
    set({ steps, index: 0, rect });
  },
  next: async () => {
    const { steps, index } = get();
    if (index + 1 >= steps.length) {
      set({ steps: [], index: 0, rect: null });
      return;
    }
    const rect = await measureStep(steps[index + 1]);
    set({ index: index + 1, rect });
  },
  stop: () => set({ steps: [], index: 0, rect: null }),
}));
