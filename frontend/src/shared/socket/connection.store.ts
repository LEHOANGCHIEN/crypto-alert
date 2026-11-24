import { create } from 'zustand';
import type { MarketStatus } from '../api/types';

type ConnectionState = {
  /** Socket.IO connection to our backend is up */
  connected: boolean;
  /** true after the first successful connect (no "Reconnecting…" banner before that) */
  everConnected: boolean;
  /** Upstream (Binance) status from `market:status` */
  marketStatus: MarketStatus;
};

export const useConnection = create<ConnectionState>(() => ({ connected: false, everConnected: false, marketStatus: 'connected' }));
