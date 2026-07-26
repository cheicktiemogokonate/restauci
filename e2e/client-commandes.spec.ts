import { expect, test } from "@playwright/test";
import { e2eCredentials } from "./global-setup";

test("un client retrouve une commande et voit sa confirmation", async ({ page }) => {
  await page.goto("/client/login");
  await page.getByLabel("Téléphone").fill(e2eCredentials.clientPhone);
  await page.getByLabel("Mot de passe").fill(e2eCredentials.clientPassword);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page).toHaveURL(/\/client$/);

  await page.goto("/commandes");
  await expect(page.getByText(`Commande ${e2eCredentials.commandeNumero}`)).toBeVisible();

  await page.getByLabel("Rechercher une commande par son numéro").fill("E2E-CMD");
  await expect(page.getByText(`Commande ${e2eCredentials.commandeNumero}`)).toBeVisible();
  await expect(page.getByText(`Commande ${e2eCredentials.commandeAnnuleeNumero}`)).not.toBeVisible();

  await page.getByText(`Commande ${e2eCredentials.commandeNumero}`).click();
  await expect(page.getByText("Commande validée")).toBeVisible();
  await expect(page.getByText("Votre commande est reçue")).toBeVisible();
  await expect(page.getByText("Progression")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Annuler la commande" }),
  ).toBeVisible();
});

test("les retours client ramènent toujours à la carte", async ({ page }) => {
  await page.goto("/client/login");
  await page.getByLabel("Téléphone").fill(e2eCredentials.clientPhone);
  await page.getByLabel("Mot de passe").fill(e2eCredentials.clientPassword);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page).toHaveURL(/\/client$/);

  await page.goto("/profil");
  await page.getByRole("link", { name: "Retour aux restaurants" }).click();
  await expect(page).toHaveURL(/\/client$/);

  await page.goto("/commandes");
  await page.getByRole("link", { name: "Retour aux restaurants" }).click();
  await expect(page).toHaveURL(/\/client$/);

  await page.goto(`/client/restaurant/${e2eCredentials.restaurantSlug}`);
  await page.getByRole("link", { name: "Retour aux restaurants" }).click();
  await expect(page).toHaveURL(/\/client$/);
});
