import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

/**
 * The profile password is never stored. What is stored is a salted SHA-256 of it, and that lives in
 * expo-secure-store — on Android it's encrypted with a key held by the Android Keystore, so copying
 * the app's files doesn't let anyone brute-force it offline. That's why a slow KDF isn't needed
 * here (pure-JS scrypt took seconds on the phone): checking is one native hash — instant.
 * Stored format: sha256$<salt hex>$<hash hex>
 *
 * When sync arrives, the key that encrypts the transfer will be derived with a slow KDF — once per
 * sync, where a couple of seconds don't matter.
 */
const STORE_KEY = 'amber-ledger.profile-password';

export const MIN_PASSWORD_LENGTH = 4;

const toHex = (bytes: Uint8Array) => Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
const fromHex = (hex: string) => new Uint8Array((hex.match(/../g) ?? []).map((h) => parseInt(h, 16)));

async function saltedHash(password: string, salt: Uint8Array): Promise<Uint8Array> {
  const passwordBytes = new TextEncoder().encode(password);
  const input = new Uint8Array(salt.length + passwordBytes.length);
  input.set(salt);
  input.set(passwordBytes, salt.length);
  return new Uint8Array(await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, input));
}

export async function setProfilePassword(password: string): Promise<void> {
  const salt = Crypto.getRandomBytes(16);
  const hash = await saltedHash(password, salt);
  await SecureStore.setItemAsync(STORE_KEY, ['sha256', toHex(salt), toHex(hash)].join('$'));
}

export async function checkProfilePassword(password: string): Promise<boolean> {
  const stored = await SecureStore.getItemAsync(STORE_KEY);
  if (!stored) return false;
  const [scheme, saltHex, hashHex] = stored.split('$');
  if (scheme !== 'sha256' || !saltHex || !hashHex) return false;
  const actual = await saltedHash(password, fromHex(saltHex));
  const expected = fromHex(hashHex);
  // Compare every byte (no early exit) so timing doesn't hint how much matched.
  let difference = expected.length ^ actual.length;
  for (let i = 0; i < expected.length; i++) difference |= expected[i] ^ (actual[i] ?? 0);
  return difference === 0;
}
