import { useEffect } from 'react';
import { useMatch } from 'react-router-dom';
import { useSymbols } from '../../shared/market/queries';
import { useLastSymbol } from '../../shared/nav/lastSymbol';

/** Remembers the last real pair opened on /trade/:symbol or /coin/:symbol (unknown pairs are ignored). */
export function LastSymbolTracker() {
  const trade = useMatch('/trade/:symbol');
  const coin = useMatch('/coin/:symbol');
  const symbol = (trade ?? coin)?.params.symbol?.toUpperCase();
  const symbols = useSymbols();
  const set = useLastSymbol((s) => s.set);
  const known = symbol !== undefined && symbols.data?.some((s) => s.symbol === symbol);
  useEffect(() => {
    if (symbol && known) set(symbol);
  }, [symbol, known, set]);
  return null;
}
