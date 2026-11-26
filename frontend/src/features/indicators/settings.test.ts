import { DEFAULT_INDICATOR_SETTINGS, parsePeriod, parseSettings } from './settings';

describe('parsePeriod', () => {
  it('accepts integers 2–200', () => {
    expect(parsePeriod('2')).toBe(2);
    expect(parsePeriod(' 50 ')).toBe(50);
    expect(parsePeriod('200')).toBe(200);
  });
  it.each(['1', '201', 'abc', '', '7.5', '-5', '1e2', '0'])('rejects %j', (v) => expect(parsePeriod(v)).toBeNull());
});

describe('parseSettings', () => {
  it('returns defaults (MA 7/25/99 on, RSI and MACD off) for nothing or garbage', () => {
    expect(parseSettings(null)).toEqual(DEFAULT_INDICATOR_SETTINGS);
    expect(parseSettings('{oops')).toEqual(DEFAULT_INDICATOR_SETTINGS);
    expect(DEFAULT_INDICATOR_SETTINGS.ma.map((m) => m.period)).toEqual([7, 25, 99]);
  });
  it('shows the volume overlay by default and keeps a stored choice', () => {
    expect(DEFAULT_INDICATOR_SETTINGS.volume).toBe(true);
    expect(parseSettings(JSON.stringify({ volume: false })).volume).toBe(false);
    expect(parseSettings(JSON.stringify({ volume: 'no' })).volume).toBe(true);
  });
  it('keeps valid stored values and replaces invalid ones field by field', () => {
    const s = parseSettings(JSON.stringify({ ma: [{ period: 50, enabled: true }, { period: 1, enabled: false }], rsi: true, macd: 'x' }));
    expect(s.ma).toEqual([
      { period: 50, enabled: true },
      { period: 25, enabled: false },
      { period: 99, enabled: true },
    ]);
    expect(s.rsi).toBe(true);
    expect(s.macd).toBe(false);
  });
});
