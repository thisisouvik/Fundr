import { defineConfig, devices } from "@playwright/test";

/**
 * Fundr – Playwright configuration
 * Docs: https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 90_000,       // generous timeout for on-chain Soroban tx confirmation
  expect: { timeout: 10_000 },
  fullyParallel: false,  // serial to avoid wallet nonce collisions on Testnet
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],

  use: {
    baseURL: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  // Start the Next.js dev server before running tests
  webServer: {
    command: "npm run dev",
    url: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
