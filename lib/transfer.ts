import LocalTransfer, { type TransferTicket } from '@/modules/local-transfer/src/LocalTransferModule';
import { buildBackup, parseBackup, restoreBackup } from './backup';

/**
 * Phone-to-phone transfer. The old phone shows a QR with its Wi-Fi address and a one-time key;
 * the new phone scans it and pulls the data straight from it, encrypted (native side:
 * modules/local-transfer). No internet, no servers, no files.
 */

/** Prefix of our QR text, so a random QR code isn't mistaken for a transfer. */
const QR_PREFIX = 'amberledger-transfer:1:';

/** Expo Go can't load our native module — the transfer needs the installed app. */
export const transferAvailable = LocalTransfer !== null;

export async function startSending(): Promise<{ qr: string; ticket: TransferTicket }> {
  if (!LocalTransfer) throw new Error('NEEDS_APP');
  const ticket = await LocalTransfer.startSending(JSON.stringify(await buildBackup()));
  return { qr: QR_PREFIX + JSON.stringify(ticket), ticket };
}

export function stopSending(): void {
  LocalTransfer?.stopSending().catch(() => {});
}

/** Called when the other phone got the data, and when a code's window closes for any reason —
 * with that code's port, so an old code closing can't be mistaken for the current one. */
export function onTransferEvents(onSent: (port: number) => void, onClosed: (port: number) => void): () => void {
  if (!LocalTransfer) return () => {};
  const sent = LocalTransfer.addListener('onSent', ({ port }) => onSent(port));
  const closed = LocalTransfer.addListener('onClosed', ({ port }) => onClosed(port));
  return () => {
    sent.remove();
    closed.remove();
  };
}

export type ScanResult = { ticket: TransferTicket } | { problem: 'notOurs' | 'expired' };

export function readQr(text: string): ScanResult {
  if (!text.startsWith(QR_PREFIX)) return { problem: 'notOurs' };
  try {
    const ticket = JSON.parse(text.slice(QR_PREFIX.length)) as TransferTicket;
    if (!ticket.host || !ticket.port || !ticket.key || !ticket.token) return { problem: 'notOurs' };
    if (ticket.expiresAt < Date.now()) return { problem: 'expired' };
    return { ticket };
  } catch {
    return { problem: 'notOurs' };
  }
}

/** Pulls the data from the other phone and replaces everything here with it. */
export async function receiveAndRestore(ticket: TransferTicket): Promise<void> {
  if (!LocalTransfer) throw new Error('NEEDS_APP');
  const text = await LocalTransfer.receive(ticket.host, ticket.port, ticket.key, ticket.token);
  const payload = parseBackup(text);
  if (payload === 'notBackup' || payload === 'newer') throw new Error(payload);
  await restoreBackup(payload);
}
