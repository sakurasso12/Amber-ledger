import { scryptAsync } from '@noble/hashes/scrypt.js';
import { bytesToHex, hexToBytes, utf8ToBytes } from '@noble/hashes/utils.js';
import { getRandomBytes } from 'expo-crypto';

/**
 * Profile passwords are never stored — only a salted scrypt hash. scrypt is deliberately slow and
 * memory-hungry, so guessing passwords from a stolen hash is expensive. Stored format:
 *   scrypt$<N>$<r>$<p>$<salt hex>$<hash hex>
 * The parameters are kept in the string so they can be raised later without breaking old hashes.
 */
const N = 2 ** 14;
const R = 8;
const P = 1;
const KEY_LENGTH = 32;

export async function hashPassword(password: string): Promise<string> {
  const salt = getRandomBytes(16);
  const hash = await scryptAsync(utf8ToBytes(password), salt, { N, r: R, p: P, dkLen: KEY_LENGTH });
  return ['scrypt', N, R, P, bytesToHex(salt), bytesToHex(hash)].join('$');
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, n, r, p, saltHex, hashHex] = stored.split('$');
  if (scheme !== 'scrypt' || !saltHex || !hashHex) return false;
  const hash = await scryptAsync(utf8ToBytes(password), hexToBytes(saltHex), {
    N: Number(n),
    r: Number(r),
    p: Number(p),
    dkLen: hashHex.length / 2,
  });
  // Compare every byte (no early exit) so timing doesn't hint how much of the hash matched.
  const expected = hexToBytes(hashHex);
  let difference = expected.length ^ hash.length;
  for (let i = 0; i < expected.length; i++) difference |= expected[i] ^ (hash[i] ?? 0);
  return difference === 0;
}

export const MIN_PASSWORD_LENGTH = 6;
