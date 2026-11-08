/**
 * Native parts stood in for while testing: sound, widgets, notifications and the database.
 * The database is a tiny in-memory stand-in for the repos, so store logic runs as in the app.
 */
jest.mock('expo-audio', () => ({ createAudioPlayer: jest.fn(), setAudioModeAsync: jest.fn(() => Promise.resolve()) }));
jest.mock('@/lib/sounds', () => ({ playDoneSound: jest.fn(), preloadSounds: jest.fn() }));
jest.mock('@/lib/widgetRefresh', () => ({ refreshHomeWidget: jest.fn() }));
jest.mock('@/notifications', () => ({
  checkBudgetAlerts: jest.fn(),
  cancelTaskReminder: jest.fn(),
  clearStickyNotification: jest.fn(),
  syncStickyNotification: jest.fn(),
  syncTaskReminder: jest.fn(),
}));
jest.mock('@/db/settingsRepo', () => {
  const values = new Map<string, string>();
  const storage = {
    getItem: async (key: string) => values.get(key) ?? null,
    setItem: async (key: string, value: string) => void values.set(key, value),
    removeItem: async (key: string) => void values.delete(key),
  };
  return { getSetting: storage.getItem, setSetting: storage.setItem, removeSetting: storage.removeItem, sqliteStateStorage: storage };
});
jest.mock('@/db/financeRepo', () => {
  let n = 0;
  const id = () => `id${++n}`;
  return {
    createExpense: jest.fn(async (draft) => ({
      id: id(),
      createdAt: new Date().toISOString(),
      planId: null,
      planRole: null,
      taskId: null,
      ...draft,
    })),
    updateExpense: jest.fn(async () => {}),
    deleteExpense: jest.fn(async () => {}),
    saveAdjustment: jest.fn(async () => {}),
    saveIncome: jest.fn(async () => {}),
    saveUpcoming: jest.fn(async () => {}),
    deleteUpcoming: jest.fn(async () => {}),
    saveAccount: jest.fn(async () => {}),
    deleteAccount: jest.fn(async () => {}),
    deleteAdjustmentsOf: jest.fn(async () => {}),
    createTransfer: jest.fn(async (draft) => ({ id: id(), createdAt: new Date().toISOString(), ...draft })),
    deleteTransfer: jest.fn(async () => {}),
    saveLoan: jest.fn(async () => {}),
    deleteLoan: jest.fn(async () => {}),
  };
});
jest.mock('@/db/tasksRepo', () => ({
  updateTask: jest.fn(async () => {}),
  deleteTask: jest.fn(async () => {}),
  createNextRecurringInstance: jest.fn(async (source, deadlineAt) => ({ ...source, id: `${source.id}-next`, deadlineAt, status: 'not_started', completedAt: null })),
}));
