import { useQuery } from '@tanstack/react-query';
import { request } from '../api/http';
import type { Candle, Interval, SymbolInfo, Ticker } from '../api/types';

/** Query keys are fixed by frontend/CONTEXT.md. Market data is public: no auth header. */
export const useSymbols = () =>
  useQuery({
    queryKey: ['symbols'],
    queryFn: () => request<SymbolInfo[]>('GET', '/market/symbols', undefined, { auth: false }),
    staleTime: 5 * 60_000,
  });

export const useTickers = () =>
  useQuery({
    queryKey: ['tickers'],
    queryFn: () => request<Ticker[]>('GET', '/market/tickers', undefined, { auth: false }),
    staleTime: 30_000,
  });

export const KLINES_LIMIT = 1000;

export const useKlines = (symbol: string, interval: Interval, enabled: boolean) =>
  useQuery({
    queryKey: ['klines', symbol, interval],
    queryFn: () =>
      request<Candle[]>('GET', `/market/klines?symbol=${encodeURIComponent(symbol)}&interval=${interval}&limit=${KLINES_LIMIT}`, undefined, {
        auth: false,
      }),
    enabled,
    // Every visit loads the window again; the server decides how much comes from its cache (AC-CHART-04).
    staleTime: 0,
    refetchOnMount: 'always',
  });
