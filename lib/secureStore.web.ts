/**
 * Web / desktop (2.0): there's no Keystore in a browser, so values go to localStorage.
 * Only the salted password hash lives here — never the password itself. In the Tauri desktop app
 * this can later move to the OS keyring.
 */
const PREFIX = 'amber-ledger.secure.';

export async function getItemAsync(key: string): Promise<string | null> {
  return globalThis.localStorage?.getItem(PREFIX + key) ?? null;
}

export async function setItemAsync(key: string, value: string): Promise<void> {
  globalThis.localStorage?.setItem(PREFIX + key, value);
}

export async function deleteItemAsync(key: string): Promise<void> {
  globalThis.localStorage?.removeItem(PREFIX + key);
}
