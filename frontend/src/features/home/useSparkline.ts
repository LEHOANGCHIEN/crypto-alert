import { useQuery } from '@tanstack/react-query';
import { request } from '../../shared/api/http';
import type { Candle } from '../../shared/api/types';

/** 24 hourly candles for a home card sparkline: one request per card, key `['klines', symbol, '1h', 24]`. */
export const useSparkline = (symbol: string) =>
  useQuery({
    queryKey: ['klines', symbol, '1h', 24],
    queryFn: () => request<Candle[]>('GET', `/market/klines?symbol=${encodeURIComponent(symbol)}&interval=1h&limit=24`, undefined, { auth: false }),
    staleTime: 60_000,
  });
