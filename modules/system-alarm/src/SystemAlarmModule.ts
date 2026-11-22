import { NativeModule, requireOptionalNativeModule } from 'expo';

export interface SystemAlarmItem {
  key: string;
  /** When to hand the alarm to the Clock (ms). */
  triggerAt: number;
  /** When it rings (ms) — a hand-off after this is skipped. */
  alarmAt: number;
  hour: number;
  minute: number;
  label: string;
  /** Text of the "tap to set" notification used when the Clock can't be opened from background. */
  hint: string;
}

declare class SystemAlarmModule extends NativeModule<{}> {
  hasClock(): boolean;
  /** "Display over other apps" — needed to set the alarm while the app is closed. */
  canRunInBackground(): boolean;
  isBatteryUnrestricted(): boolean;
  openBackgroundSettings(): void;
  requestBatteryUnrestricted(): void;
  sync(items: SystemAlarmItem[]): void;
}

/** null on iOS / web / Expo Go — the alarm toggle is hidden then. */
export default requireOptionalNativeModule<SystemAlarmModule>('SystemAlarm');
