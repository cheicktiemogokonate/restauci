import { expect, test } from "@playwright/test";

test("la plateforme démarre avec la configuration de test", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Toutci/i);
});
