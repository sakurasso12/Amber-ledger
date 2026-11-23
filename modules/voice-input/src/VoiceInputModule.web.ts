/**
 * Web / desktop (2.0): the browser's own speech recognition (Chrome, Edge — Web Speech API) in place
 * of Android's RecognizerIntent. Same shape as the native module; null where the browser has none
 * (Firefox), which hides the mic button.
 */
type Recognition = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
};

const Ctor: (new () => Recognition) | undefined =
  typeof window === 'undefined'
    ? undefined
    : ((window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition })
        .SpeechRecognition ??
      (window as unknown as { webkitSpeechRecognition?: new () => Recognition }).webkitSpeechRecognition);

const VoiceInputWeb = Ctor
  ? {
      recognize(language: string | null): Promise<string | null> {
        return new Promise((resolve) => {
          const r = new Ctor();
          r.lang = language ?? navigator.language;
          r.interimResults = false;
          r.maxAlternatives = 1;
          let text: string | null = null;
          r.onresult = (e) => {
            text = e.results[0]?.[0]?.transcript ?? null;
          };
          r.onerror = () => resolve(null);
          r.onend = () => resolve(text);
          try {
            r.start();
          } catch {
            resolve(null);
          }
        });
      },
    }
  : null;

export default VoiceInputWeb;
