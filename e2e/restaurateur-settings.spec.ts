import { expect, test, type Page } from "@playwright/test";
import { e2eCredentials } from "./global-setup";

test.describe.configure({ mode: "serial" });

const dishName = "Plat de validation E2E";

async function connectRestaurateur(page: Page) {
  const response = await page.request.post("/api/auth/login", {
    data: {
      email: e2eCredentials.email,
      password: e2eCredentials.password,
    },
  });
  expect(response.ok()).toBeTruthy();
  const token = response.headers()["set-cookie"]?.match(/token=([^;]+)/)?.[1];
  expect(token).toBeTruthy();
  await page.context().addCookies([
    {
      name: "token",
      value: token!,
      domain: "127.0.0.1",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
}

async function publicMenu(page: Page) {
  return page.request.get(
    `/api/v1/public/restaurants/${e2eCredentials.restaurantSlug}/menu`,
  );
}

test("un restaurant hors ligne disparaît du menu public puis réapparaît", async ({ page }) => {
  await connectRestaurateur(page);
  await page.goto("/restaurateur/profil");

  const serviceSwitch = page.getByRole("switch", {
    name: "Mettre le restaurant en ligne",
  });
  await expect(serviceSwitch).toBeChecked();
  await serviceSwitch.click();
  await expect(
    page.getByText("Votre restaurant est hors ligne et invisible aux clients."),
  ).toBeVisible();

  await expect
    .poll(async () => (await publicMenu(page)).status())
    .toBe(404);

  await serviceSwitch.click();
  await expect(
    page.getByText("Votre restaurant est visible et reçoit des commandes."),
  ).toBeVisible();
  await expect
    .poll(async () => (await publicMenu(page)).status())
    .toBe(200);
});

test("un plat masqué disparaît du menu public puis est rétabli", async ({ page }) => {
  await connectRestaurateur(page);
  await page.goto("/restaurateur/menu");

  const availabilitySwitch = page.getByRole("switch", {
    name: `Rendre ${dishName} indisponible`,
  });
  await expect(availabilitySwitch).toBeChecked();
  await availabilitySwitch.click();
  await expect(page.getByText("Plat masqué du menu.")).toBeVisible();

  const hiddenMenu = await publicMenu(page);
  expect(hiddenMenu.ok()).toBeTruthy();
  expect(JSON.stringify(await hiddenMenu.json())).not.toContain(dishName);

  await page
    .getByRole("switch", { name: `Rendre ${dishName} disponible` })
    .click();
  await expect(page.getByText("Plat rendu disponible.")).toBeVisible();

  const restoredMenu = await publicMenu(page);
  expect(restoredMenu.ok()).toBeTruthy();
  expect(JSON.stringify(await restoredMenu.json())).toContain(dishName);
});

test("le profil enregistre une adresse et un horaire sans modifier le service", async ({ page }) => {
  await connectRestaurateur(page);
  await page.goto("/restaurateur/profil");

  const serviceSwitch = page.getByRole("switch", {
    name: "Mettre le restaurant en ligne",
  });
  await expect(serviceSwitch).toBeChecked();

  await page.getByLabel("Adresse").fill("Cocody Riviera 3, Rue des Jardins");
  await page.getByRole("button", { name: "Sauvegarder" }).click();
  await expect(page.getByText("Configuration enregistrée avec succès.")).toBeVisible();
  await expect(serviceSwitch).toBeChecked();

  const slotName = `Service E2E ${Date.now()}`;
  await page.getByRole("button", { name: "Ajouter un créneau" }).click();
  await page.getByLabel("Nom du créneau").fill(slotName);
  await page.getByRole("button", { name: "Ajouter le créneau" }).click();
  await expect(page.getByText(slotName, { exact: true })).toBeVisible();

  await page.getByRole("button", { name: `Supprimer ${slotName}` }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Supprimer" }).click();
  await expect(page.getByText(slotName, { exact: true })).not.toBeVisible();
});
