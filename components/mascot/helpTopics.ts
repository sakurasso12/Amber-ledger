import type { HelpScreen } from './TymofiiHelp';

/**
 * Which on-screen element each "How does it work?" topic points at, in the order of
 * tr.help.screens[screen]. null = no spotlight (Тимофій explains in the middle of the screen).
 * Ids are registered with useHelpTarget().
 */
export const HELP_TARGETS: Record<HelpScreen, (string | null)[]> = {
  tasks: ['tasks.fab', 'tasks.fab', 'tasks.focus', 'tasks.focus', 'tasks.edit', 'tasks.focus'],
  calendar: [null, null],
  finance: ['finance.fab', 'finance.balance', 'finance.pending', 'finance.workCalendar', 'finance.edit', 'finance.budget', 'finance.menu'],
  stats: [null, 'stats.edit'],
  settings: [null, null, null, null, null],
};
