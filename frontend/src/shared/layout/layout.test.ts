import { describe, expect, it } from 'vitest';
import { clampWidth, defaultLayout, parseLayout, resolveDrag } from './layout';

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
});
