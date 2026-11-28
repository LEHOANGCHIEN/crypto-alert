import { useEffect } from 'react';
import { useMatch } from 'react-router-dom';
import { useSymbols } from '../shared/market/queries';
import { useLastSymbol } from '../shared/nav/lastSymbol';
import { rememberSymbol } from '../shared/search/lib/recent';

/** Remembers the last real pair opened on /chart/:symbol or /coin/:symbol (unknown pairs are ignored). */
export function LastSymbolTracker() {
  const trade = useMatch('/chart/:symbol');
  const coin = useMatch('/coin/:symbol');
  const symbol = (trade ?? coin)?.params.symbol?.toUpperCase();
  const symbols = useSymbols();
  const set = useLastSymbol((s) => s.set);
  const known = symbol !== undefined && symbols.data?.some((s) => s.symbol === symbol);
  useEffect(() => {
    if (symbol && known) {
      set(symbol);
      rememberSymbol(symbol); // recent pairs of the search dialog (AC-SITE-02)
    }
  }, [symbol, known, set]);
  return null;
}
