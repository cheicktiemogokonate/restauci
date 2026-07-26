import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 45_000,
  // Tous les scénarios manipulent le même restaurant isolé : les exécuter
  // l'un après l'autre rend les transitions et le seed parfaitement fiables.
  workers: 1,
  globalSetup: "./e2e/global-setup.ts",
  use: { baseURL: "http://127.0.0.1:3100", trace: "on-first-retry" },
  webServer: {
    command: "NEXT_DIST_DIR=.next-e2e node scripts/with-test-env.mjs npm run dev -- --port 3100",
    url: "http://127.0.0.1:3100",
    reuseExistingServer: process.env.PW_REUSE_SERVER === "true",
  },
});
