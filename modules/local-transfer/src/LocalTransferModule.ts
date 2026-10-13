import { NativeModule, requireOptionalNativeModule } from 'expo';

/** What the sending phone puts into the QR. */
export interface TransferTicket {
  host: string;
  port: number;
  /** AES-256 key, base64 — only ever in the QR. */
  key: string;
  /** Proof the receiver scanned the QR, base64. */
  token: string;
  /** ms since epoch: the sending phone stops waiting after this. */
  expiresAt: number;
}

type Events = {
  /** The data went to the other phone. */
  onSent: (event: { port: number }) => void;
  /** The transfer window is over (sent, cancelled or timed out). */
  onClosed: (event: { port: number }) => void;
};

declare class LocalTransferModule extends NativeModule<Events> {
  startSending(payload: string): Promise<TransferTicket>;
  stopSending(): Promise<void>;
  receive(host: string, port: number, key: string, token: string): Promise<string>;
}

/** null in Expo Go, which can't load app-specific native code — the transfer needs the app build. */
export default requireOptionalNativeModule<LocalTransferModule>('LocalTransfer');
