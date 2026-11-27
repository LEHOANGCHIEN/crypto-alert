import { describe, expect, it } from 'vitest';
import { distancePercent } from './distance';

describe('distancePercent', () => {
  it('is positive when the target is above the current price', () => {
    expect(distancePercent(110, 100)).toBeCloseTo(10);
  });
  it('is negative when the target is below the current price', () => {
    expect(distancePercent(95, 100)).toBeCloseTo(-5);
  });
  it('is null without a usable current price', () => {
    expect(distancePercent(100, undefined)).toBeNull();
    expect(distancePercent(100, 0)).toBeNull();
    expect(distancePercent(100, Number.NaN)).toBeNull();
  });
});
