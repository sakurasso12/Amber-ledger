import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { sqliteStateStorage } from '@/db/settingsRepo';
import { AppSettings, DEFAULT_SETTINGS } from '@/types';
import { LAYOUTS } from '@/theme/layouts';
import { DESIGNS } from '@/theme/designs';

interface SettingsState {
  settings: AppSettings;
  hasHydrated: boolean;
  updateSettings: (patch: Partial<AppSettings>) => void;
  setWidgetBackground: (widgetId: string, uri: string) => void;
  clearWidgetBackground: (widgetId: string) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      settings: DEFAULT_SETTINGS,
      hasHydrated: false,
      updateSettings: (patch) => set((state) => ({ settings: { ...state.settings, ...patch } })),
      setWidgetBackground: (widgetId, uri) =>
        set((state) => ({
          settings: { ...state.settings, widgetBackgrounds: { ...state.settings.widgetBackgrounds, [widgetId]: uri } },
        })),
      clearWidgetBackground: (widgetId) =>
        set((state) => {
          const next = { ...state.settings.widgetBackgrounds };
          delete next[widgetId];
          return { settings: { ...state.settings, widgetBackgrounds: next } };
        }),
    }),
    {
      name: 'app-settings',
      storage: {
        getItem: async (name) => {
          const value = await sqliteStateStorage.getItem(name);
          return value ? JSON.parse(value) : null;
        },
        setItem: async (name, value) => {
          await sqliteStateStorage.setItem(name, JSON.stringify(value));
        },
        removeItem: sqliteStateStorage.removeItem,
      },
      // Deep-merge against DEFAULT_SETTINGS so a settings blob persisted by an older version of
      // the app (missing fields added later) doesn't leave `settings` with undefined properties.
      merge: (persisted, current) => {
        const persistedSettings = (persisted as Partial<SettingsState> | null)?.settings;
        const settings = { ...DEFAULT_SETTINGS, ...persistedSettings };
        // Layouts and themes that were tried and dropped fall back to the defaults.
        if (!LAYOUTS[settings.layoutId]) settings.layoutId = DEFAULT_SETTINGS.layoutId;
        if (!DESIGNS[settings.designId]) settings.designId = DEFAULT_SETTINGS.designId;
        // 'fingerprint' was merged into 'device' (fingerprint or phone PIN).
        if (settings.financeLockMethod !== 'password') settings.financeLockMethod = 'device';
        return { ...current, settings };
      },
      onRehydrateStorage: () => () => {
        useSettingsStore.setState({ hasHydrated: true });
      },
    }
  )
);
