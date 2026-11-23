import { z } from 'zod';

const bool = z.enum(['true', 'false']).transform((v) => v === 'true');

export const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(3000),
    DATABASE_URL: z.string().min(1),
    JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
    JWT_ACCESS_TTL_SECONDS: z.coerce.number().int().positive().default(900),
    REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(7),
    COOKIE_SECURE: bool.default(false),
    MARKET_DATA_PROVIDER: z.enum(['binance', 'mock']).default('binance'),
    BINANCE_REST_BASE_URL: z.string().url().default('https://data-api.binance.vision'),
    BINANCE_WS_BASE_URL: z.string().min(1).default('wss://data-stream.binance.vision'),
    MOCK_AUTO_TICK: bool.default(false),
    ENABLE_TEST_ENDPOINTS: bool.default(false),
    LOGIN_RATE_LIMIT_PER_MINUTE: z.coerce.number().int().positive().default(10),
    TRUST_PROXY_HOPS: z.coerce.number().int().min(0).default(0),
    SERVE_FRONTEND: bool.default(false),
    FRONTEND_DIST_PATH: z.string().default('../frontend/dist'),
    LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  })
  .refine((e) => !(e.NODE_ENV === 'production' && e.ENABLE_TEST_ENDPOINTS), {
    message: 'ENABLE_TEST_ENDPOINTS must not be true when NODE_ENV=production',
    path: ['ENABLE_TEST_ENDPOINTS'],
  });

export type Env = z.infer<typeof envSchema>;

/** Used by ConfigModule: fails fast at boot with the list of bad variables (never prints values). */
export function validateEnv(raw: Record<string, unknown>): Env {
  const parsed = envSchema.safeParse(raw);
  if (!parsed.success) {
    const lines = parsed.error.issues.map((i) => `  - ${i.path.join('.') || '(env)'}: ${i.message}`);
    throw new Error(`Invalid environment configuration:\n${lines.join('\n')}`);
  }
  return parsed.data;
}

/** True when the test-support module may be mounted (API.md §3.8). */
export function testEndpointsEnabled(raw: Record<string, unknown>): boolean {
  return raw.ENABLE_TEST_ENDPOINTS === 'true' && raw.MARKET_DATA_PROVIDER === 'mock';
}
