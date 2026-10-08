import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { usePathname } from 'expo-router';
import * as LocalAuthentication from 'expo-local-authentication';
import { useSettingsStore } from './useSettingsStore';
import { refreshHomeWidget } from '@/lib/widgetRefresh';
import { checkProfilePassword } from '@/lib/password';
import { FINANCE_LOCK_MAX_MINUTES } from '@/types';

/**
 * Finance lock. Unlocked state is a timestamp (settings.financeUnlockedUntil) rather than a flag,
 * because the home screen widgets read it without the app running.
 *  - N minutes (1–30): unlocking opens a window of exactly N minutes, counted from the unlock —
 *    it closes on its own even while you keep using the app.
 *  - 0: stays open only while you're on a money screen; leaving it (another tab, or the app
 *    going to the background) locks at once.
 */

const minutesFromNow = (minutes: number) => new Date(Date.now() + minutes * 60_000).toISOString();

function isUnlocked(until: string | null): boolean {
  return !!until && new Date(until).getTime() > Date.now();
}

function setUnlockedUntil(until: string | null) {
  useSettingsStore.getState().updateSettings({ financeUnlockedUntil: until });
  refreshHomeWidget();
}

/** Screens that count as "in finances" for the 0-minute mode (incl. editors opened from them). */
function isMoneyScreen(pathname: string): boolean {
  return /^\/(finance|stats|expense|category)(\/|$)/.test(pathname);
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

/** System check: fingerprint only, or (fingerprintOnly = false) with the phone's PIN/pattern as
 * fallback. Android can't ask for the PIN alone while a fingerprint is enrolled. */
export async function unlockWithDevice(prompt: string, cancelLabel: string, fingerprintOnly: boolean): Promise<boolean> {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: prompt,
    cancelLabel,
    disableDeviceFallback: fingerprintOnly,
    // No extra "Confirm" tap after a match — straight in.
    requireConfirmation: false,
  });
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
  // 0 = "until you leave the screen": a safety cap here, the real lock comes from leaving.
  setUnlockedUntil(minutesFromNow(financeLockMinutes > 0 ? financeLockMinutes : FINANCE_LOCK_MAX_MINUTES));
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

/** Mount once in the root layout: enforces the timer, the 0-minute mode and keeps widgets in step. */
export function useFinanceLockLifecycle() {
  const enabled = useSettingsStore((s) => s.settings.financeLockEnabled);
  const minutes = useSettingsStore((s) => s.settings.financeLockMinutes);
  const until = useSettingsStore((s) => s.settings.financeUnlockedUntil);
  const pathname = usePathname();

  // The window ran out → lock for real (clears the timestamp and redraws the widgets).
  useEffect(() => {
    if (!enabled || !until) return;
    const msLeft = new Date(until).getTime() - Date.now();
    if (msLeft <= 0) {
      lockFinances();
      return;
    }
    const timer = setTimeout(lockFinances, msLeft + 50);
    return () => clearTimeout(timer);
  }, [enabled, until]);

  // 0-minute mode: leaving the money screens locks immediately.
  useEffect(() => {
    if (enabled && minutes <= 0 && until && !isMoneyScreen(pathname)) lockFinances();
  }, [enabled, minutes, until, pathname]);

  // 0-minute mode: so does sending the app to the background. Coming back re-checks the window,
  // since timers may have been paused while the app was in the background.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      const { financeLockEnabled, financeLockMinutes, financeUnlockedUntil } = useSettingsStore.getState().settings;
      if (!financeLockEnabled || !financeUnlockedUntil) return;
      if (state === 'background' && financeLockMinutes <= 0) lockFinances();
      if (state === 'active' && !isUnlocked(financeUnlockedUntil)) lockFinances();
    });
    return () => subscription.remove();
  }, []);
}
