import { parseTarget, toInputText } from './target';

describe('parseTarget', () => {
  it.each([
    ['', 'REQUIRED'],
    ['   ', 'REQUIRED'],
    ['abc', 'INVALID_TYPE'],
    ['1.2.3', 'INVALID_TYPE'],
    ['1e5', 'INVALID_TYPE'],
    ['0', 'OUT_OF_RANGE'],
    ['0.000', 'OUT_OF_RANGE'],
    ['-5', 'OUT_OF_RANGE'],
    ['2000000000000000', 'OUT_OF_RANGE'],
    ['1.123456789', 'TOO_MANY_DECIMALS'],
  ])('%p → %s', (raw, code) => {
    expect(parseTarget(raw).issue?.code).toBe(code);
  });

  it.each([
    ['67234.5', 67234.5],
    ['67234,5', 67234.5],
    [' 100 ', 100],
    ['0.12345678', 0.12345678],
    ['.5', 0.5],
  ])('%p → %p', (raw, value) => {
    expect(parseTarget(raw)).toEqual({ value });
  });
});

describe('toInputText', () => {
  it.each([
    [67234.5, '67234.5'],
    [100, '100'],
    [0.0000001, '0.0000001'],
    [0.12345678, '0.12345678'],
  ])('%p → %p', (price, text) => {
    expect(toInputText(price)).toBe(text);
  });
});
