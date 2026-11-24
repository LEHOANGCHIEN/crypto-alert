import { beforeEach, describe, expect, it, vi } from 'vitest';

type Handler = (...args: unknown[]) => void;
const handlers = new Map<string, Handler>();
const connect = vi.fn();
const fakeSocket = { on: (e: string, h: Handler) => handlers.set(e, h), connect, connected: false, active: false, emit: vi.fn() };
vi.mock('socket.io-client', () => ({ io: () => fakeSocket }));

import { getSocket } from './socket';

describe('socket client', () => {
  beforeEach(() => {
    connect.mockClear();
    vi.stubGlobal('navigator', { onLine: true });
    getSocket();
  });

  it('reconnects itself after the server closed the connection', () => {
    handlers.get('disconnect')?.('io server disconnect');
    expect(connect).toHaveBeenCalledTimes(1);
  });

  it('leaves other disconnect reasons to Socket.IO auto-reconnect', () => {
    handlers.get('disconnect')?.('transport close');
    expect(connect).not.toHaveBeenCalled();
  });

  it('does not reconnect a server disconnect while the browser is offline', () => {
    vi.stubGlobal('navigator', { onLine: false });
    handlers.get('disconnect')?.('io server disconnect');
    expect(connect).not.toHaveBeenCalled();
  });
});
