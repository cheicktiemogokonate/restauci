import { expect, test, type Page } from "@playwright/test";
import { e2eCredentials } from "./global-setup";

test.describe.configure({ mode: "serial" });

async function connectAdmin(page: Page) {
  const response = await page.request.post("/api/auth/login", {
    data: {
      email: e2eCredentials.adminEmail,
      password: e2eCredentials.adminPassword,
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

test("l’administration refuse une session anonyme", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/login$/);
});

test("les vues principales de l’administration sont accessibles", async ({
  page,
}) => {
  await connectAdmin(page);

  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: /Bonjour/ })).toBeVisible();

  const pages = [
    ["/admin/a-traiter", "À traiter"],
    ["/admin/restaurants", "Restaurants"],
    ["/admin/users", "Comptes et accès"],
    ["/admin/abonnements", "Abonnements"],
    ["/admin/commissions", "Finance"],
    ["/admin/audit", "Journal d’audit"],
    ["/admin/support", "Support et investigations"],
    ["/admin/parametres", "Paramètres"],
  ] as const;

  for (const [url, heading] of pages) {
    await page.goto(url);
    await expect(page.getByRole("heading", { name: heading }).first()).toBeVisible();
  }
});

test("un administrateur valide, suspend puis réactive un restaurant", async ({
  page,
}) => {
  await connectAdmin(page);
  await page.goto("/admin/restaurants?statut=en_attente");

  await page
    .getByRole("link", { name: e2eCredentials.adminRestaurantName })
    .click();
  await expect(page.getByText("En attente de validation")).toBeVisible();

  await page.getByRole("button", { name: "Valider" }).click();
  await expect(page.getByText("Restaurant validé.")).toBeVisible();
  await expect(page.getByText("Actif", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Suspendre" }).click();
  await page
    .getByPlaceholder("Motif de la suspension...")
    .fill("Contrôle administratif E2E");
  await page
    .getByRole("button", { name: "Confirmer la suspension" })
    .click();
  await expect(page.getByText("Restaurant suspendu.")).toBeVisible();

  await page.getByRole("button", { name: "Réactiver" }).click();
  await expect(page.getByText("Restaurant réactivé.")).toBeVisible();
  await expect(page.getByText("Actif", { exact: true })).toBeVisible();
});
