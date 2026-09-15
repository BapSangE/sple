import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  workers: 1,
  timeout: 30_000,
  use: { baseURL: "http://127.0.0.1:3100", viewport: { width: 390, height: 844 }, trace: "retain-on-failure" },
  webServer: [
    { command: "node e2e/backend.mjs", url: "http://127.0.0.1:3101/health", reuseExistingServer: !process.env.CI },
    { command: "npm run dev -- --hostname 127.0.0.1 --port 3100", url: "http://127.0.0.1:3100/add", reuseExistingServer: !process.env.CI,
      env: { NEXTAUTH_URL: "http://127.0.0.1:3100", NEXTAUTH_SECRET: "e2e-only-session-secret", GOOGLE_CLIENT_ID: "e2e-google", GOOGLE_CLIENT_SECRET: "e2e-google-secret", BACKEND_API_URL: "http://127.0.0.1:3101", BACKEND_API_KEY: "e2e-internal-key" } },
  ],
});
