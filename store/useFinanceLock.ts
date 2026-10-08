import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { useSettingsStore } from './useSettingsStore';
import { refreshHomeWidget } from '@/lib/widgetRefresh';
import { checkProfilePassword } from '@/lib/password';

/**
 * Finance lock. Unlocked state is a timestamp (settings.financeUnlockedUntil) rather than a flag,
 * because the home screen widgets read it without the app running:
 *  - unlocking sets it to now + the chosen delay;
 *  - while the app is open and unlocked it's kept in the future;
 *  - leaving the app sets it to now + delay, and a timer re-locks (and redraws widgets) when it runs out.
 */

const minutesFromNow = (minutes: number) => new Date(Date.now() + minutes * 60_000).toISOString();

function isUnlocked(until: string | null): boolean {
  return !!until && new Date(until).getTime() > Date.now();
}

function setUnlockedUntil(until: string | null) {
  useSettingsStore.getState().updateSettings({ financeUnlockedUntil: until });
  refreshHomeWidget();
}

/** True when money should be hidden right now. Re-renders when the unlock window runs out. */
export function useFinanceLocked(): boolean {
  const enabled = useSettingsStore((s) => s.settings.financeLockEnabled);
  const until = useSettingsStore((s) => s.settings.financeUnlockedUntil);
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!enabled || !isUnlocked(until)) return;
    const timer = setTimeout(() => setTick((t) => t + 1), new Date(until!).getTime() - Date.now() + 50);
    return () => clearTimeout(timer);
  }, [enabled, until]);

  return enabled && !isUnlocked(until);
}

/** Fingerprint (or the phone's PIN/pattern as fallback). Returns true on success. */
export async function unlockWithDevice(prompt: string, cancelLabel: string): Promise<boolean> {
  const result = await LocalAuthentication.authenticateAsync({ promptMessage: prompt, cancelLabel });
  if (result.success) unlockFinances();
  return result.success;
}

/** Profile password — the fallback when the fingerprint isn't available or was forgotten. */
export async function unlockWithPassword(password: string): Promise<boolean> {
  if (!(await checkProfilePassword(password))) return false;
  unlockFinances();
  return true;
}

export function unlockFinances() {
  const { financeLockMinutes } = useSettingsStore.getState().settings;
  // While the app is open the window is kept generous; leaving the app shortens it (see below).
  setUnlockedUntil(minutesFromNow(Math.max(financeLockMinutes, 30)));
}

export function lockFinances() {
  setUnlockedUntil(null);
}

/** Whether this phone can do a fingerprint/face check and has one enrolled. */
export async function deviceAuthAvailable(): Promise<boolean> {
  const [hasHardware, enrolled] = await Promise.all([
    LocalAuthentication.hasHardwareAsync(),
    LocalAuthentication.isEnrolledAsync(),
  ]);
  return hasHardware && enrolled;
}

/** Mount once (root layout): starts the re-lock countdown when the app goes to the background. */
export function useFinanceLockLifecycle() {
  useEffect(() => {
    let relockTimer: ReturnType<typeof setTimeout> | null = null;

    const subscription = AppState.addEventListener('change', (state) => {
      const { financeLockEnabled, financeLockMinutes, financeUnlockedUntil } = useSettingsStore.getState().settings;
      if (!financeLockEnabled || !isUnlocked(financeUnlockedUntil)) return;

      if (state === 'background') {
        if (financeLockMinutes <= 0) {
          lockFinances();
          return;
        }
        setUnlockedUntil(minutesFromNow(financeLockMinutes));
        if (relockTimer) clearTimeout(relockTimer);
        // Best effort: if Android freezes the app, widgets catch up on their next scheduled update.
        relockTimer = setTimeout(lockFinances, financeLockMinutes * 60_000 + 500);
      } else if (state === 'active') {
        if (relockTimer) clearTimeout(relockTimer);
        relockTimer = null;
        // Back within the window: stay unlocked and stretch it again while the app is in use.
        unlockFinances();
      }
    });

    return () => {
      subscription.remove();
      if (relockTimer) clearTimeout(relockTimer);
    };
  }, []);
}
