import { isConditionMet, type AlertCondition } from './alert-match';

export type IndexedAlert = { id: number; userId: number; symbol: string; condition: AlertCondition; targetPrice: number };

/** In-memory index of ACTIVE alerts by symbol (ARCHITECTURE §5). Small scale: a linear scan per symbol is fine. */
export class AlertIndex {
  private bySymbol = new Map<string, Map<number, IndexedAlert>>();
  private symbolOf = new Map<number, string>();

  get size(): number {
    return this.symbolOf.size;
  }

  /** Replace the whole content (boot / reload). */
  load(alerts: Iterable<IndexedAlert>): void {
    this.bySymbol.clear();
    this.symbolOf.clear();
    for (const a of alerts) this.add(a);
  }

  add(a: IndexedAlert): void {
    this.remove(a.id);
    let m = this.bySymbol.get(a.symbol);
    if (!m) this.bySymbol.set(a.symbol, (m = new Map()));
    m.set(a.id, a);
    this.symbolOf.set(a.id, a.symbol);
  }

  remove(id: number): void {
    const symbol = this.symbolOf.get(id);
    if (symbol === undefined) return;
    this.symbolOf.delete(id);
    const m = this.bySymbol.get(symbol);
    m?.delete(id);
    if (m && m.size === 0) this.bySymbol.delete(symbol);
  }

  has(id: number): boolean {
    return this.symbolOf.has(id);
  }

  /** ACTIVE alerts of `symbol` whose condition is met at `price`. */
  matching(symbol: string, price: number): IndexedAlert[] {
    const m = this.bySymbol.get(symbol);
    if (!m) return [];
    return [...m.values()].filter((a) => isConditionMet(a.condition, a.targetPrice, price));
  }
}
