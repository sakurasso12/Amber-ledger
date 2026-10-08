import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { useSettingsStore } from '@/store/useSettingsStore';

let player: AudioPlayer | null = null;

/**
 * Creates the player and starts loading the sound. Called once at app start (see app/_layout) so
 * the file is ready by the first completed task — a play() sent before it has loaded is dropped.
 */
export function preloadSounds(): void {
  if (player) return;
  // Duck whatever music is playing for a moment instead of stopping it.
  setAudioModeAsync({ interruptionMode: 'duckOthers', playsInSilentMode: false, shouldPlayInBackground: false }).catch(() => {});
  player = createAudioPlayer(require('@/assets/sounds/level-up.mp3'));
}

/** The "done" sound — every completed task. Off in Settings → Notifications. */
export function playDoneSound(): void {
  if (!useSettingsStore.getState().settings.soundEffects) {
    console.log('[sound] off in settings');
    return;
  }
  try {
    preloadSounds();
    const p = player!;
    console.log('[sound] play — loaded:', p.isLoaded, 'volume:', p.volume, 'muted:', p.muted);
    const start = () => {
      p.seekTo(0).catch(() => {});
      p.play();
    };
    if (p.isLoaded) {
      start();
      return;
    }
    // Still loading (first second after launch): play as soon as it's ready.
    const sub = p.addListener('playbackStatusUpdate', (status) => {
      if (!status.isLoaded) return;
      sub.remove();
      start();
    });
  } catch (error) {
    console.warn('[sound] failed to play:', error);
  }
}
