import { readQr } from '@/lib/transfer';

const ticket = { host: '192.168.1.23', port: 41234, key: 'a2V5', token: 'dG9r', expiresAt: Date.now() + 60_000 };

describe('transfer QR', () => {
  it('reads our own code', () => {
    expect(readQr(`amberledger-transfer:1:${JSON.stringify(ticket)}`)).toEqual({ ticket });
  });

  it('refuses other QR codes', () => {
    expect(readQr('https://example.com')).toEqual({ problem: 'notOurs' });
    expect(readQr('amberledger-transfer:1:{broken')).toEqual({ problem: 'notOurs' });
  });

  it('refuses a code that ran out', () => {
    const old = { ...ticket, expiresAt: Date.now() - 1 };
    expect(readQr(`amberledger-transfer:1:${JSON.stringify(old)}`)).toEqual({ problem: 'expired' });
  });
});
