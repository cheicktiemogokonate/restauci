import { expect, test } from "@playwright/test";

/**
 * Chauffe le serveur dev avant les specs métier : en Turbopack, les chunks
 * demandés pendant leur première compilation renvoient 403 et le navigateur
 * ne les retélécharge pas — la page reste non hydratée. Ce parcours force la
 * compilation des pages clés et vérifie l'hydratation (rechargement inclus),
 * afin que les specs suivants trouvent un serveur chaud.
 */
test.describe.configure({ mode: "serial" });

const PAGES = ["/", "/client/login", "/login", "/register"];

test("chauffe le serveur (compilation Turbopack) et vérifie l'hydratation", async ({ page }) => {
  test.setTimeout(120_000);
  for (const path of PAGES) {
    let hydrated = false;
    for (let attempt = 0; attempt < 4 && !hydrated; attempt++) {
      await page.goto(path, { waitUntil: "networkidle", timeout: 60_000 });
      await page.waitForTimeout(1_000);
      hydrated = await page.evaluate(
        () => Boolean(document.querySelector('button:not([disabled]), input')),
      );
      if (!hydrated) await page.waitForTimeout(2_000);
    }
    expect(hydrated, `${path} doit s'hydrater (chunks compilés)`).toBeTruthy();
  }
});
