import { useSettingsStore } from '@/store/useSettingsStore';
import { translations } from './translations';

export * from './translations';
export { useTranslation } from './useTranslation';

/** Non-hook access to the current translation, for use outside React components (e.g. the
 * notification scheduler, which fires from store actions rather than render). */
export function getTranslation() {
  return translations[useSettingsStore.getState().settings.language];
}
