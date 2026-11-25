import { badgeText } from './badge';

describe('badgeText', () => {
  it.each([
    [0, null],
    [-1, null],
    [1, '1'],
    [9, '9'],
    [10, '9+'],
    [250, '9+'],
  ])('%p → %p', (count, text) => {
    expect(badgeText(count)).toBe(text);
  });
});
