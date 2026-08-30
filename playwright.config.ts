import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

// Load .env.local for testing
dotenv.config({ path: path.resolve(__dirname, '.env.local') });

// DEVELOPMENT Supabase Project Verification Guard
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const PRODUCTION_PROJECT_ID = 'hnjfxdyterpbmkisaiiw';
const DEVELOPMENT_PROJECT_ID = 'zxrzqyvlydsdczngxxst';

if (supabaseUrl.includes(PRODUCTION_PROJECT_ID)) {
  console.error('\n🚨 FATAL ERROR: Playwright is configured to run against the PRODUCTION Supabase project.');
  console.error('Aborting test run to prevent production data corruption.\n');
  process.exit(1);
}

const baseURL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
if (baseURL.includes('tizkar.vercel.app')) {
  console.error('\n🚨 FATAL ERROR: Playwright is configured to run against the PRODUCTION application URL.');
  console.error('Aborting test run to prevent production data corruption.\n');
  process.exit(1);
}

if (!supabaseUrl.includes(DEVELOPMENT_PROJECT_ID)) {
  console.warn('\n⚠️ WARNING: Supabase URL does not match known Development Project ID. Running tests anyway.\n');
}

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 300000, // 5 minutes per test
  expect: {
    timeout: 10000 // 10 seconds for expect
  },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : 1, // Limit workers to 1 to prevent DB cross-contamination during E2E
  reporter: 'list',
  use: {
    baseURL: baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15000,
    navigationTimeout: 60000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] }, // Approximately 390x844
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
