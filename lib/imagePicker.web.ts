import * as ImagePicker from 'expo-image-picker';

/**
 * Web / desktop (2.0): there's no app document folder to copy photos into, so the picked image is
 * shrunk (longest side ≤ 1280 px, JPEG) and kept as a data: URL right where the phone keeps a
 * file:// path — the database, settings, backups all just store a string either way.
 */
const MAX_SIDE = 1280;

function shrink(dataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, MAX_SIDE / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(dataUrl);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

export async function pickAndPersistImage(options: { aspect?: [number, number] } = {}): Promise<string | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.85,
    allowsEditing: true,
    aspect: options.aspect,
  });
  if (result.canceled || !result.assets[0]) return null;
  return shrink(result.assets[0].uri);
}

export async function deletePersistedImage(_uri: string): Promise<void> {}

export async function deleteAllPersistedImages(): Promise<void> {}
