import { useSettingsStore } from '@/store/useSettingsStore';
import { translations } from './translations';

export function useTranslation() {
  const language = useSettingsStore((s) => s.settings.language);
  return translations[language];
}
