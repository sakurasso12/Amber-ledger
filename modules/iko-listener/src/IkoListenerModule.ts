import { NativeModule, requireOptionalNativeModule } from 'expo';

declare class IkoListenerModule extends NativeModule<{}> {
  isAvailable(): boolean;
  isEnabled(): boolean;
  openSettings(): void;
  takePending(): string;
  setTexts(title: string, channel: string): void;
}

/** null on iOS / web / Expo Go. */
export default requireOptionalNativeModule<IkoListenerModule>('IkoListener');
