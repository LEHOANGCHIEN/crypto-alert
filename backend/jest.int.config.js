// Integration tests: test/integration - real Postgres test DB
module.exports = {
  rootDir: '.',
  testRegex: 'test/integration/.*\\.int-spec\\.ts$',
  transform: { '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.check.json', diagnostics: true }] },
  setupFiles: ['<rootDir>/test/helpers/env.ts'],
  testEnvironment: 'node',
  testTimeout: 30000,
};
