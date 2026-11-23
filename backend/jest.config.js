// Unit tests: src (spec files) - no DB, no network
module.exports = {
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: { '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/../tsconfig.json', diagnostics: true }] },
  testEnvironment: 'node',
};
