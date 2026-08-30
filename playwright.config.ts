import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 120_000,
  expect: { timeout: 20_000 },
  // Tous les scénarios manipulent le même restaurant isolé : les exécuter
  // l'un après l'autre rend les transitions et le seed parfaitement fiables.
  workers: 1,
  // Un retry couvre uniquement les aléas externes (Neon/R2) après que le
  // scénario a produit une assertion exploitable.
  retries: 1,
  globalSetup: "./e2e/global-setup.ts",
  use: { baseURL: "http://127.0.0.1:3100", trace: "on-first-retry" },
  webServer: [
    {
      command: "node e2e/paystack-mock-server.mjs",
      url: "http://127.0.0.1:4100/health",
      reuseExistingServer: process.env.PW_REUSE_SERVER === "true",
    },
    {
      command:
        "PAYSTACK_TEST_API_URL=http://127.0.0.1:4100 NEXT_DIST_DIR=.next-e2e node scripts/with-test-env.mjs npm run dev -- --webpack --hostname 127.0.0.1 --port 3100",
      url: "http://127.0.0.1:3100",
      reuseExistingServer: process.env.PW_REUSE_SERVER === "true",
    },
  ],
});
