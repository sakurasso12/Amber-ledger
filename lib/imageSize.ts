const BASE64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/** Decodes the start of a base64 string — enough bytes to read an image header. */
function decodeBase64Prefix(base64: string, maxBytes: number): Uint8Array {
  const chars = base64.slice(0, Math.ceil(maxBytes / 3) * 4).replace(/=+$/, '');
  const bytes = new Uint8Array(Math.floor((chars.length * 3) / 4));
  let byteIndex = 0;
  for (let i = 0; i < chars.length; i += 4) {
    const a = BASE64_ALPHABET.indexOf(chars[i]);
    const b = BASE64_ALPHABET.indexOf(chars[i + 1]);
    const c = i + 2 < chars.length ? BASE64_ALPHABET.indexOf(chars[i + 2]) : 0;
    const d = i + 3 < chars.length ? BASE64_ALPHABET.indexOf(chars[i + 3]) : 0;
    const triple = (a << 18) | (b << 12) | (c << 6) | d;
    if (byteIndex < bytes.length) bytes[byteIndex++] = (triple >> 16) & 0xff;
    if (byteIndex < bytes.length) bytes[byteIndex++] = (triple >> 8) & 0xff;
    if (byteIndex < bytes.length) bytes[byteIndex++] = triple & 0xff;
  }
  return bytes;
}

/**
 * Pixel size of a JPEG or PNG given as base64, read from its header — no image library needed.
 * Returns null for anything it can't parse. Photos come from expo-image-picker with editing on,
 * so they're re-encoded with the EXIF rotation already applied and the header size is the real one.
 */
export function imageSizeFromBase64(base64: string): { width: number; height: number } | null {
  // EXIF blocks before the size marker can be up to 64 KB, so read a bit more than that.
  const bytes = decodeBase64Prefix(base64, 200_000);

  // PNG: width and height are the first fields of the IHDR chunk.
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    const read32 = (i: number) => ((bytes[i] << 24) | (bytes[i + 1] << 16) | (bytes[i + 2] << 8) | bytes[i + 3]) >>> 0;
    return { width: read32(16), height: read32(20) };
  }

  // JPEG: walk the segments until a start-of-frame marker, which holds the size.
  if (bytes[0] === 0xff && bytes[1] === 0xd8) {
    let i = 2;
    while (i + 9 < bytes.length) {
      if (bytes[i] !== 0xff) return null;
      const marker = bytes[i + 1];
      const isStartOfFrame = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
      if (isStartOfFrame) {
        return { height: (bytes[i + 5] << 8) | bytes[i + 6], width: (bytes[i + 7] << 8) | bytes[i + 8] };
      }
      i += 2 + ((bytes[i + 2] << 8) | bytes[i + 3]);
    }
  }
  return null;
}
