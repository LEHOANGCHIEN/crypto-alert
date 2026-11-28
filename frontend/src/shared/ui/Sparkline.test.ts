import { describe, expect, it } from 'vitest';
import { sparklinePoints } from './Sparkline';

describe('sparklinePoints', () => {
  it('returns nothing for fewer than two values', () => {
    expect(sparklinePoints([])).toBe('');
    expect(sparklinePoints([5])).toBe('');
  });

  it('scales the lowest value to the bottom and the highest to the top', () => {
    expect(sparklinePoints([1, 3], 100, 10)).toBe('0.0,9.0 100.0,1.0');
  });

  it('draws a flat line in the middle-bottom for equal values without dividing by zero', () => {
    expect(sparklinePoints([2, 2, 2], 100, 10)).toBe('0.0,9.0 50.0,9.0 100.0,9.0');
  });
});
