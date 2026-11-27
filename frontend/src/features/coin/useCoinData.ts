import { useQuery } from '@tanstack/react-query';
import { request } from '../../shared/api/http';
import type { Candle } from '../../shared/api/types';
import type { KlineQuery } from './lib/ranges';

/** Klines of one coin-page query. Key: `['klines', symbol, interval, limit]` (extends the fixed key of frontend/CONTEXT.md). */
const fetchKlines = (symbol: string, q: KlineQuery) =>
  request<Candle[]>('GET', `/market/klines?symbol=${encodeURIComponent(symbol)}&interval=${q.interval}&limit=${q.limit}`, undefined, { auth: false });

/**
 * `fresh` = the area chart: every selection asks the server for exactly its interval × limit (AC-COIN-02).
 * Tiles and stats share the same keys with a short stale time and so reuse that data.
 */
export const useRangeKlines = (symbol: string, q: KlineQuery, opts: { enabled: boolean; fresh?: boolean }) =>
  useQuery({
    queryKey: ['klines', symbol, q.interval, q.limit],
    queryFn: () => fetchKlines(symbol, q),
    enabled: opts.enabled,
    staleTime: opts.fresh ? 0 : 60_000,
    refetchOnMount: opts.fresh ? 'always' : true,
  });
