import * as ImagePicker from 'expo-image-picker';
// SDK 57 replaced expo-file-system's API with a class-based File/Directory model; the classic
// path-string API (documentDirectory, copyAsync, ...) still ships under this subpath.
import * as FileSystem from 'expo-file-system/legacy';
import { generateId } from './id';

const IMAGES_DIR = `${FileSystem.documentDirectory}amber-ledger-images/`;

async function ensureImagesDir(): Promise<void> {
  const info = await FileSystem.getInfoAsync(IMAGES_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(IMAGES_DIR, { intermediates: true });
  }
}

/**
 * Opens the system image picker and copies the chosen image into the app's own document
 * directory (the picker's own URI can point at a cache file that gets cleared, so anything we
 * want to keep across restarts needs its own stable copy). Returns the stable file:// URI, or
 * null if the user cancelled or permission was refused. `aspect` locks the crop frame's shape.
 */
export async function pickAndPersistImage(options: { aspect?: [number, number] } = {}): Promise<string | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return null;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.85,
    allowsEditing: true,
    // e.g. [1, 1] for the avatar: the picker's crop frame is locked to a square.
    aspect: options.aspect,
  });
  if (result.canceled || !result.assets[0]) return null;

  await ensureImagesDir();
  const source = result.assets[0].uri;
  const extension = source.split('.').pop()?.split('?')[0] || 'jpg';
  const destination = `${IMAGES_DIR}${generateId()}.${extension}`;
  await FileSystem.copyAsync({ from: source, to: destination });

  return destination;
}

export async function deletePersistedImage(uri: string): Promise<void> {
  if (!uri.startsWith(IMAGES_DIR)) return;
  await FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});
}
