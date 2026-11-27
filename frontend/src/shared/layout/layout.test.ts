import { describe, expect, it } from 'vitest';
import { clampBottom, clampWidth, defaultLayout, maxBottom, parseLayout, resolveDrag } from './layout';

describe('layout', () => {
  it('uses defaults for missing or broken storage', () => {
    expect(parseLayout(null)).toEqual(defaultLayout());
    expect(parseLayout('{nope')).toEqual(defaultLayout());
    expect(parseLayout('42')).toEqual(defaultLayout());
    expect(parseLayout('{"left":{"width":"x"},"right":null}')).toEqual(defaultLayout());
  });
  it('reads saved widths and collapsed flags, clamped to the limits', () => {
    const l = parseLayout('{"left":{"width":340,"collapsed":true},"right":{"width":9999}}');
    expect(l.left).toEqual({ width: 340, collapsed: true });
    expect(l.right).toEqual({ width: 520, collapsed: false });
  });
  it('clamps widths', () => {
    expect(clampWidth('left', 10)).toBe(180);
    expect(clampWidth('left', 900)).toBe(480);
    expect(clampWidth('right', 100)).toBe(260);
    expect(clampWidth('right', 900)).toBe(520);
  });
  it('collapses only when the drag ends below the minimum', () => {
    expect(resolveDrag('left', 180)).toEqual({ width: 180, collapse: false });
    expect(resolveDrag('left', 179)).toEqual({ width: 180, collapse: true });
    expect(resolveDrag('right', 700)).toEqual({ width: 520, collapse: false });
  });
  it('reads the bottom panel defensively', () => {
    expect(parseLayout('{"bottom":{"height":300,"collapsed":true}}').bottom).toEqual({ height: 300, collapsed: true });
    expect(parseLayout('{"bottom":{"height":10}}').bottom).toEqual({ height: 120, collapsed: false });
    expect(parseLayout('{"bottom":{"height":"x"}}').bottom).toEqual({ height: 240, collapsed: false });
    expect(parseLayout('{"bottom":5}').bottom).toBeUndefined();
    expect(parseLayout(null).bottom).toBeUndefined();
  });
  it('clamps the bottom panel to 120 px … 60 % of the center column', () => {
    expect(maxBottom(800)).toBe(480);
    expect(maxBottom(100)).toBe(120);
    expect(clampBottom(50, 800)).toBe(120);
    expect(clampBottom(900, 800)).toBe(480);
    expect(clampBottom(300, 800)).toBe(300);
  });
});
