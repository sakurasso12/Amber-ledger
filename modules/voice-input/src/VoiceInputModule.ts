import { NativeModule, requireOptionalNativeModule } from 'expo';

declare class VoiceInputModule extends NativeModule<{}> {
  recognize(language: string | null, prompt: string | null): Promise<string | null>;
}

/** null on iOS / web / Expo Go — the mic button is hidden then. */
export default requireOptionalNativeModule<VoiceInputModule>('VoiceInput');
