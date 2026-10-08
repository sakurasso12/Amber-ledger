import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { useSettingsStore } from '@/store/useSettingsStore';

let player: AudioPlayer | null = null;

/**
 * Creates the player and starts loading the sound. Called once at app start (see app/_layout) so
 * the file is ready by the first completed task — a play() sent before it has loaded is dropped.
 */
export function preloadSounds(): void {
  if (player) return;
  // Like other Android media (games, YouTube): follow the media volume, not the ringer — expo-audio
  // otherwise drops play() whenever the phone is on silent/vibrate, and Do Not Disturb counts as
  // silent. Mixed over any music that's playing instead of pausing it.
  setAudioModeAsync({ interruptionMode: 'mixWithOthers', playsInSilentMode: true, shouldPlayInBackground: false }).catch(() => {});
  player = createAudioPlayer(require('@/assets/sounds/level-up.mp3'));
}

/** The "done" sound — every completed task. Off in Settings → Notifications. */
export function playDoneSound(): void {
  if (!useSettingsStore.getState().settings.soundEffects) return;
  try {
    preloadSounds();
    const p = player!;
    // Rewind first and only then play: a seek that lands after play() leaves the player paused.
    const start = () => {
      if (p.currentTime > 0) p.seekTo(0).then(() => p.play(), () => p.play());
      else p.play();
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
