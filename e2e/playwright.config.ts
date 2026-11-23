import { defineConfig, devices } from '@playwright/test';

const PORT = 3100;

export default defineConfig({
  testDir: './tests',
  workers: 1,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list']],
  use: { baseURL: `http://localhost:${PORT}`, trace: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'node start-server.mjs',
    url: `http://localhost:${PORT}/api/v1/health`,
    timeout: 180_000,
    reuseExistingServer: false,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
