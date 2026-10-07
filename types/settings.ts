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
  /** Day of month from which the app asks whether the salary for a closed period has arrived
   * (1-31). Until the user confirms, that period's earnings stay in "Должно прийти" — salary often
   * lands a few days late, so nothing moves into "Банк" on its own. */
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
  /** "Банк" is a manually-set cash-on-hand figure — the user sets it whenever they want to sync
   * with reality; every expense logged after that point is subtracted and every salary confirmed
   * after it is added. `bankBalanceSetAt` is null until the user sets it for the first
   * time, meaning every expense ever logged still counts against the (default 0) base. */
  bankBalanceBase: number;
  bankBalanceSetAt: string | null;
  /** Date key (yyyy-MM-dd) of the last manual Bank update. Kept for older saved settings; not
   * read anywhere since the salary prompt replaced the payday banner. */
  lastSettledAt: string | null;
  /** Per-widget background image, keyed by a stable widget id (e.g. "finance-balance"). */
  widgetBackgrounds: Record<string, string>;
  /** Salaries the user confirmed in the "did your salary arrive?" prompt, keyed by the pay period's
   * start date (yyyy-MM-dd): the amount that actually arrived and when it was confirmed. Confirmed
   * after the last manual Bank update → added to Bank (see lib/earnings.ts payrollState). */
  salaryConfirmations: Record<string, { amount: number; confirmedAt: string }>;
  /** ISO time until which the salary prompt stays hidden after "remind me in a day". */
  salaryPromptSnoozedUntil: string | null;
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
  salaryConfirmations: {},
  salaryPromptSnoozedUntil: null,
};
