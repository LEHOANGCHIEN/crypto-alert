// Applies migrations to the TEST database, then runs the integration tests against it.
import { spawnSync } from 'node:child_process';

const url = process.env.TEST_DATABASE_URL ?? 'postgresql://app:app@localhost:5432/crypto_alert_test';
const env = { ...process.env, DATABASE_URL: url };

function run(cmd, args) {
  const r = spawnSync(cmd, args, { stdio: 'inherit', env });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

run('npx', ['prisma', 'migrate', 'deploy']);
run('npx', ['jest', '--config', 'jest.int.config.js', '--runInBand', ...process.argv.slice(2)]);
