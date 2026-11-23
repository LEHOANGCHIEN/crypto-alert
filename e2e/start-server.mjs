// Playwright webServer (docs/ARCHITECTURE.md §8): migrate test DB → build → start backend on :3100 with mock provider.
import { spawn, spawnSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const backend = resolve(root, 'backend');

const env = {
  ...process.env,
  NODE_ENV: 'test',
  PORT: '3100',
  DATABASE_URL: process.env.TEST_DATABASE_URL ?? 'postgresql://app:app@localhost:5432/crypto_alert_test',
  JWT_ACCESS_SECRET: 'e2e only - not a real secret value!!',
  JWT_ACCESS_TTL_SECONDS: '5',
  LOGIN_RATE_LIMIT_PER_MINUTE: '5',
  MARKET_DATA_PROVIDER: 'mock',
  ENABLE_TEST_ENDPOINTS: 'true',
  COOKIE_SECURE: 'false',
  SERVE_FRONTEND: 'true',
  FRONTEND_DIST_PATH: resolve(root, 'frontend/dist'),
  LOG_LEVEL: 'warn',
};

function run(cmd, args, cwd) {
  const r = spawnSync(cmd, args, { cwd, env, stdio: 'inherit' });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

run('npx', ['prisma', 'migrate', 'deploy'], backend);
run('npm', ['run', 'build'], root);

const server = spawn('node', ['dist/main.js'], { cwd: backend, env, stdio: 'inherit' });
server.on('exit', (code) => process.exit(code ?? 0));
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => server.kill(sig));
