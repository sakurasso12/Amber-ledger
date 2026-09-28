/** Locally-unique id: timestamp (sortable) + random suffix. No network, no collisions in practice for a single-device app. */
export function generateId(): string {
  const time = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 10);
  return `${time}-${random}`;
}
