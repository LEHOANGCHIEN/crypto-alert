import { testEndpointsEnabled, validateEnv } from './env';

const base = { DATABASE_URL: 'postgresql://app:app@localhost:5432/x', JWT_ACCESS_SECRET: 'a'.repeat(32) };

describe('env validation', () => {
  it('applies defaults', () => {
    const e = validateEnv(base);
    expect(e.PORT).toBe(3000);
    expect(e.MARKET_DATA_PROVIDER).toBe('binance');
    expect(e.ENABLE_TEST_ENDPOINTS).toBe(false);
  });
  it('fails fast on a missing required variable and names it without printing values', () => {
    expect(() => validateEnv({ JWT_ACCESS_SECRET: 'a'.repeat(32) })).toThrow(/DATABASE_URL/);
  });
  it('rejects a short JWT secret', () => {
    expect(() => validateEnv({ ...base, JWT_ACCESS_SECRET: 'short' })).toThrow(/JWT_ACCESS_SECRET/);
  });
  it('refuses production with test endpoints enabled', () => {
    expect(() => validateEnv({ ...base, NODE_ENV: 'production', ENABLE_TEST_ENDPOINTS: 'true', MARKET_DATA_PROVIDER: 'mock' })).toThrow(/ENABLE_TEST_ENDPOINTS/);
  });
  it('test endpoints need both flag and mock provider', () => {
    expect(testEndpointsEnabled({ ENABLE_TEST_ENDPOINTS: 'true', MARKET_DATA_PROVIDER: 'mock' })).toBe(true);
    expect(testEndpointsEnabled({ ENABLE_TEST_ENDPOINTS: 'true', MARKET_DATA_PROVIDER: 'binance' })).toBe(false);
    expect(testEndpointsEnabled({ ENABLE_TEST_ENDPOINTS: 'false', MARKET_DATA_PROVIDER: 'mock' })).toBe(false);
  });
});
