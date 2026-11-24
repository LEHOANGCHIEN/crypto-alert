import { create } from 'zustand';
import type { MarketStatus } from '../api/types';

type ConnectionState = {
  /** Socket.IO connection to our backend is up */
  connected: boolean;
  /** true after the first successful connect (no "Reconnecting…" banner before that) */
  everConnected: boolean;
  /** Upstream (Binance) status from `market:status` */
  marketStatus: MarketStatus;
  /** `tickers:subscribe` acknowledged on the current connection */
  tickersLive: boolean;
  /** `SYMBOL:interval` whose `kline:subscribe` was acknowledged on the current connection */
  klineLive: string | null;
};

export const useConnection = create<ConnectionState>(() => ({
  connected: false,
  everConnected: false,
  marketStatus: 'connected',
  tickersLive: false,
  klineLive: null,
}));
