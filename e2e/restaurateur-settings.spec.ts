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
  expect(
    (await page.context().cookies()).some((cookie) =>
      cookie.name.endsWith("restauci_session")
    )
  ).toBeTruthy();
}

async function publicMenu(page: Page) {
  return page.request.get(
    `/api/v1/public/restaurants/${e2eCredentials.restaurantSlug}/menu`,
  );
}

async function waitForHydration(page: Page) {
  await page.locator('html[data-e2e-hydrated="true"]').waitFor({
    state: "attached",
    timeout: 90_000,
  });
}

test("un restaurant hors ligne reste visible mais refuse les commandes", async ({ page }) => {
  await connectRestaurateur(page);
  await page.goto("/restaurateur/profil");
  await waitForHydration(page);

  const serviceSwitch = page.getByRole("switch", {
    name: "Mettre le restaurant en ligne",
  });
  // Le scénario est réentrant : un retry repart de l'état laissé par une
  // tentative interrompue, puis le finally restaure le service pour les specs
  // suivantes.
  if (!(await serviceSwitch.isChecked())) {
    await serviceSwitch.click();
    await expect(serviceSwitch).toBeChecked({ timeout: 90_000 });
  }
  await expect(serviceSwitch).toBeChecked();
  try {
    await serviceSwitch.click();
    await expect(
      page.getByText("Votre restaurant reste visible, mais les commandes sont fermées."),
    ).toBeVisible();

    await expect
      .poll(async () => (await publicMenu(page)).status(), { timeout: 90_000 })
      .toBe(200);

    const clientLogin = await page.request.post("/api/v1/client/auth/login", {
      data: {
        telephone: e2eCredentials.clientPhone,
        password: e2eCredentials.clientPassword,
        tokenTransport: "json",
      },
    });
    expect(clientLogin.ok()).toBeTruthy();
    const clientLoginBody = (await clientLogin.json()) as {
      data: { tokens: { accessToken: string } };
    };
    const prevalidation = await page.request.post(
      "/api/v1/client/commandes/prevalidate",
      {
        headers: {
          Authorization: `Bearer ${clientLoginBody.data.tokens.accessToken}`,
        },
        data: {
          restaurantSlug: e2eCredentials.restaurantSlug,
          modeCommande: "emporter",
        },
      },
    );
    expect(prevalidation.status()).toBe(422);
    await expect(prevalidation.json()).resolves.toMatchObject({
      success: false,
      error: "Ce restaurant n'accepte pas de commandes actuellement.",
    });
  } finally {
    if (!(await serviceSwitch.isChecked())) {
      await serviceSwitch.click();
      await expect(serviceSwitch).toBeChecked({ timeout: 90_000 });
    }
  }

  await expect(
    page.getByText("Votre restaurant est visible et reçoit des commandes."),
  ).toBeVisible();
  await expect
    .poll(async () => (await publicMenu(page)).status(), { timeout: 90_000 })
    .toBe(200);
});

test("un plat masqué disparaît du menu public puis est rétabli", async ({ page }) => {
  await connectRestaurateur(page);
  await page.goto("/restaurateur/menu");
  await waitForHydration(page);

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
  await waitForHydration(page);

  const serviceSwitch = page.getByRole("switch", {
    name: "Mettre le restaurant en ligne",
  });
  await expect(serviceSwitch).toBeChecked();

  await page.getByLabel("Adresse").fill("Cocody Riviera 3, Rue des Jardins");
  const saveProfile = page.getByRole("button", { name: "Sauvegarder" });
  const profileSaved = page.getByText("Configuration enregistrée avec succès.");
  // Les écritures Neon peuvent subir une coupure transitoire. La mise à jour
  // est idempotente ; une nouvelle soumission doit réellement aboutir avant
  // de poursuivre le scénario.
  await expect(async () => {
    if (await profileSaved.isVisible()) return;
    await saveProfile.click();
    await expect(profileSaved).toBeVisible({ timeout: 20_000 });
  }).toPass({ timeout: 90_000, intervals: [1_000, 2_000, 5_000] });
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
