// Runs before the app module is imported (jest setupFiles).
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.DATABASE_URL?.includes('_test')
  ? process.env.DATABASE_URL
  : (process.env.TEST_DATABASE_URL ?? 'postgresql://app:app@localhost:5432/crypto_alert_test');
process.env.JWT_ACCESS_SECRET = 'integration test only - not a real secret!!';
process.env.MARKET_DATA_PROVIDER = 'mock';
process.env.ENABLE_TEST_ENDPOINTS = 'true';
process.env.SERVE_FRONTEND = 'false';
process.env.LOG_LEVEL = 'error';
