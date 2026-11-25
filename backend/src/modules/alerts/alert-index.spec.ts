import { AlertIndex, type IndexedAlert } from './alert-index';

const a = (id: number, symbol: string, condition: 'ABOVE' | 'BELOW', targetPrice: number, userId = 1): IndexedAlert => ({ id, userId, symbol, condition, targetPrice });

describe('AlertIndex', () => {
  it('matches only alerts of the ticked symbol whose condition is met', () => {
    const idx = new AlertIndex();
    idx.load([a(1, 'BTCUSDT', 'ABOVE', 100), a(2, 'BTCUSDT', 'BELOW', 50), a(3, 'ETHUSDT', 'ABOVE', 10)]);
    expect(idx.size).toBe(3);
    expect(idx.matching('BTCUSDT', 99).map((x) => x.id)).toEqual([]);
    expect(idx.matching('BTCUSDT', 100).map((x) => x.id)).toEqual([1]);
    expect(idx.matching('BTCUSDT', 50).map((x) => x.id)).toEqual([2]);
    expect(idx.matching('ETHUSDT', 11).map((x) => x.id)).toEqual([3]);
    expect(idx.matching('SOLUSDT', 1e9)).toEqual([]);
  });

  it('add/remove keep the index in sync; re-adding an id replaces it; removing unknown ids is a no-op', () => {
    const idx = new AlertIndex();
    idx.add(a(1, 'BTCUSDT', 'ABOVE', 100));
    idx.add(a(1, 'ETHUSDT', 'ABOVE', 100));
    expect(idx.size).toBe(1);
    expect(idx.matching('BTCUSDT', 200)).toEqual([]);
    expect(idx.matching('ETHUSDT', 200).map((x) => x.id)).toEqual([1]);
    idx.remove(1);
    idx.remove(42);
    expect(idx.size).toBe(0);
    expect(idx.has(1)).toBe(false);
    expect(idx.matching('ETHUSDT', 200)).toEqual([]);
  });

  it('load replaces previous content', () => {
    const idx = new AlertIndex();
    idx.add(a(1, 'BTCUSDT', 'ABOVE', 1));
    idx.load([a(2, 'ETHUSDT', 'BELOW', 1)]);
    expect(idx.has(1)).toBe(false);
    expect(idx.has(2)).toBe(true);
  });
});
