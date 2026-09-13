import { defineConfig } from "@playwright/test";

const e2ePort = process.env.E2E_PORT ?? "3100";
const e2eBaseUrl = `http://127.0.0.1:${e2ePort}`;
const usesRealPaystack = process.env.E2E_PAYSTACK_LIVE === "true";

const appServer = {
  command:
    `${usesRealPaystack ? "" : "PAYSTACK_TEST_API_URL=http://127.0.0.1:4100 "}` +
    `E2E_APP_URL=${e2eBaseUrl} NEXT_DIST_DIR=.next-e2e node scripts/with-test-env.mjs npm run dev -- --webpack --hostname 127.0.0.1 --port ${e2ePort}`,
  url: e2eBaseUrl,
  reuseExistingServer: process.env.PW_REUSE_SERVER === "true",
};

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
  use: { baseURL: e2eBaseUrl, trace: "on-first-retry" },
  webServer: usesRealPaystack
    ? [appServer]
    : [
        {
          command: "node e2e/paystack-mock-server.mjs",
          url: "http://127.0.0.1:4100/health",
          reuseExistingServer: process.env.PW_REUSE_SERVER === "true",
        },
        appServer,
      ],
});
