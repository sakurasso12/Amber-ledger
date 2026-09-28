export type ThemeMode = 'light' | 'dark' | 'system';

export type AppLanguage = 'ru' | 'uk' | 'en';

export interface AppSettings {
  hourlyRate: number;
  hoursPerShift: number;
  currency: string;
  /** Day of month the work/pay period starts on (1-31). 1 = plain calendar month. E.g. 15 = the
   * period runs the 15th through the 14th of the next month. Drives "Должно прийти" and which
   * calendar days count as an already-closed (greyed out) past period. */
  payPeriodStartDay: number;
  /** Day of month salary actually arrives (1-31) — used only to remind the user to update "Банк".
   * Independent of the work-period boundaries above, since payroll often lands days after the
   * period it covers actually closes. */
  paydayDay: number;
  themeMode: ThemeMode;
  /** Custom accent hex color overriding the active theme's primary/accent, or null to use the
   * theme's own default. */
  accentColor: string | null;
  language: AppLanguage;
  /** Minutes before a task deadline to fire the reminder notification. */
  reminderMinutesBefore: number;
  notificationsEnabled: boolean;
  budgetLimitWeek: number | null;
  budgetLimitMonth: number | null;
  /** Local file:// URI of the app-wide background image, or null for none. */
  backgroundImageUri: string | null;
  /** Local file:// URI of the Android home screen widget's background photo, or null for the
   * default solid background. Read directly from settings by the widget's headless task handler
   * (widget-task-handler.ts), which can't use React context. */
  homeWidgetBackgroundUri: string | null;
  /** "Банк" is a manually-set cash-on-hand figure, not derived from the calendar — the user sets
   * it whenever they want to sync with reality, and every expense logged after that point is
   * subtracted automatically. `bankBalanceSetAt` is null until the user sets it for the first
   * time, meaning every expense ever logged still counts against the (default 0) base. */
  bankBalanceBase: number;
  bankBalanceSetAt: string | null;
  /** Date key (yyyy-MM-dd) of the last time the user acknowledged the payday reminder banner (set
   * together with a Bank update, since in practice that's the same real-world moment). Only gates
   * the banner — work-period boundaries and "Должно прийти" are driven by payPeriodStartDay. */
  lastSettledAt: string | null;
  /** Per-widget background image, keyed by a stable widget id (e.g. "finance-balance"). */
  widgetBackgrounds: Record<string, string>;
}

export const DEFAULT_SETTINGS: AppSettings = {
  hourlyRate: 0,
  hoursPerShift: 8,
  currency: 'zł',
  payPeriodStartDay: 1,
  paydayDay: 1,
  themeMode: 'system',
  accentColor: null,
  language: 'ru',
  reminderMinutesBefore: 30,
  notificationsEnabled: true,
  budgetLimitWeek: null,
  budgetLimitMonth: null,
  backgroundImageUri: null,
  homeWidgetBackgroundUri: null,
  bankBalanceBase: 0,
  bankBalanceSetAt: null,
  lastSettledAt: null,
  widgetBackgrounds: {},
};
