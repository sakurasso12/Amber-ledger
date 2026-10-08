import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { useSettingsStore } from '@/store/useSettingsStore';

let player: AudioPlayer | null = null;

/** Created on first use and kept — one short sound, restarted on every play. */
function getPlayer(): AudioPlayer {
  if (!player) {
    // Duck whatever music is playing for a moment instead of stopping it; respect silent mode.
    setAudioModeAsync({ interruptionMode: 'duckOthers', playsInSilentMode: false, shouldPlayInBackground: false }).catch(() => {});
    player = createAudioPlayer(require('@/assets/sounds/level-up.mp3'));
  }
  return player;
}

/** The "done" sound — every completed task, and the level ring filling up. Off in Settings → Notifications. */
export function playDoneSound(): void {
  if (!useSettingsStore.getState().settings.soundEffects) return;
  try {
    const p = getPlayer();
    p.seekTo(0);
    p.play();
  } catch (error) {
    console.warn('[sound] failed to play:', error);
  }
}
