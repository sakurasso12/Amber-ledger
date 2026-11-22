import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { useSettingsStore } from '@/store/useSettingsStore';

let player: AudioPlayer | null = null;
let purrPlayer: AudioPlayer | null = null;
let realPlayer: AudioPlayer | null = null;

/** Real recordings (CC0, BigSoundBank #0436 / #0494), trimmed in ~/Downloads/tymofii-sounds. */
let lastMix: 'purr' | 'meow' = 'meow';
function mascotSource(): number {
  let pick = useSettingsStore.getState().settings.mascotSound;
  if (pick === 'mix') {
    // Mix: purr and meow take turns, never the same twice in a row.
    lastMix = lastMix === 'purr' ? 'meow' : 'purr';
    pick = lastMix;
  }
  return pick === 'meow' ? require('@/assets/sounds/meow.mp3') : require('@/assets/sounds/purr.mp3');
}

/**
 * The bundled chime, unless a personal sound sits in assets/sounds/local/ (git-ignored — e.g. a game
 * sound that can't be published). require.context finds it at build time if it's there.
 */
function doneSoundSource(): number {
  const local = require.context('../assets/sounds/local', false, /\.(mp3|wav|ogg|m4a)$/);
  const keys = local.keys();
  return keys.length > 0 ? local(keys[0]) : require('@/assets/sounds/done.mp3');
}

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
  player = createAudioPlayer(doneSoundSource());
  purrPlayer = createAudioPlayer(mascotSource());
}

/** The "done" sound — every completed task. Off in Settings → Notifications. */
export function playDoneSound(): void {
  const { soundEffects, purrOnTask } = useSettingsStore.getState().settings;
  if (!soundEffects) return;
  play(purrOnTask ? 'purr' : 'done');
}

/** The easter-egg page: always Тимофій's real purr, whatever sound is picked in Settings. */
export function playRealPurr(): void {
  try {
    realPlayer?.remove();
    realPlayer = createAudioPlayer(require('@/assets/sounds/purr.mp3'));
    realPlayer.play();
  } catch (e) {
    console.warn('[sound] real purr failed', e);
  }
}

/** Тимофій's sound (purr or meow, Settings) — the "listen" button. Plays even if task sounds are off. */
export function playPurr(): void {
  play('purr');
}

function play(which: 'done' | 'purr'): void {
  try {
    preloadSounds();
    if (which === 'purr') {
      // A finished expo-audio player sometimes ignores seek+play, so the purr gets a fresh player
      // every time (it's a small file; the old one is released).
      purrPlayer?.remove();
      purrPlayer = createAudioPlayer(mascotSource());
    }
    const p = which === 'purr' ? purrPlayer! : player!;
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
