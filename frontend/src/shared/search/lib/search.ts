import { coinName } from '../../market/coin-names';
import type { SymbolInfo } from '../../api/types';

/** Lower-case and strip diacritics so "bieu do" finds "Biểu đồ" and "eth" finds "Ethereum". */
export function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}

/**
 * Rank of a pair for a query (lower = better, `null` = no match): exact base asset, symbol prefix,
 * base-asset prefix, name prefix, then "contains" in symbol / base asset / known name.
 */
export function pairRank(info: Pick<SymbolInfo, 'symbol' | 'baseAsset'>, query: string): number | null {
  const q = normalize(query);
  if (!q) return null;
  const symbol = info.symbol.toLowerCase();
  const base = info.baseAsset.toLowerCase();
  const name = normalize(coinName(info.baseAsset) ?? '');
  if (base === q) return 0;
  if (symbol.startsWith(q)) return 1;
  if (base.startsWith(q)) return 2;
  if (name && name.startsWith(q)) return 3;
  if (symbol.includes(q) || base.includes(q) || (name && name.includes(q))) return 4;
  return null;
}

/** Pairs matching the query, best rank first; ties keep the given order (24h volume order of the market list). */
export function searchPairs<T extends Pick<SymbolInfo, 'symbol' | 'baseAsset'>>(pairs: T[], query: string, limit = 8): T[] {
  return pairs
    .map((p, index) => ({ p, index, rank: pairRank(p, query) }))
    .filter((x): x is { p: T; index: number; rank: number } => x.rank !== null)
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .slice(0, limit)
    .map((x) => x.p);
}

/** Pages match when the query is contained in their translated label (diacritics ignored). */
export function matchPages<T extends { label: string }>(pages: T[], query: string): T[] {
  const q = normalize(query);
  if (!q) return [];
  return pages.filter((p) => normalize(p.label).includes(q));
}
