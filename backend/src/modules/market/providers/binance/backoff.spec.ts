import { BACKOFF_MAX_MS, backoffDelay } from './backoff';

describe('backoffDelay', () => {
  const mid = () => 0.5; // no jitter

  it('doubles from 1 s and caps at 30 s', () => {
    expect([0, 1, 2, 3, 4, 5, 6, 10].map((a) => backoffDelay(a, mid))).toEqual([1000, 2000, 4000, 8000, 16000, 30000, 30000, 30000]);
  });

  it('applies at most ±20 % jitter', () => {
    expect(backoffDelay(0, () => 0)).toBe(800);
    expect(backoffDelay(0, () => 0.999999)).toBe(1200);
    expect(backoffDelay(20, () => 0)).toBe(BACKOFF_MAX_MS * 0.8);
    for (let i = 0; i < 200; i++) {
      const d = backoffDelay(3);
      expect(d).toBeGreaterThanOrEqual(6400);
      expect(d).toBeLessThanOrEqual(9600);
    }
  });
});
