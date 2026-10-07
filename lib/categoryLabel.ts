import { Category } from '@/types';
import { DEFAULT_CATEGORIES } from '@/db/schema';
import type { Translation } from '@/i18n/translations';

const DEFAULT_NAME_BY_ID = new Map(DEFAULT_CATEGORIES.map((c) => [c.id, c.name]));

/** Display name of a category. The built-in ones are stored with their Russian names (seeded on
 * first launch), so they're translated here — unless the user renamed them, then their own name wins. */
export function categoryLabel(category: Pick<Category, 'id' | 'name'> | undefined | null, tr: Translation): string {
  if (!category) return '—';
  const builtIn = tr.defaultCategories[category.id as keyof Translation['defaultCategories']];
  if (builtIn && DEFAULT_NAME_BY_ID.get(category.id) === category.name) return builtIn;
  return category.name;
}
