import { isConditionMet } from './alert-match';

describe('isConditionMet', () => {
  it.each([
    ['ABOVE', 100, 99.99, false],
    ['ABOVE', 100, 100, true],
    ['ABOVE', 100, 100.01, true],
    ['BELOW', 100, 100.01, false],
    ['BELOW', 100, 100, true],
    ['BELOW', 100, 99.99, true],
  ] as const)('%s %p at price %p → %p', (condition, target, price, met) => {
    expect(isConditionMet(condition, target, price)).toBe(met);
  });
});
