import { expect, test, type Page } from "@playwright/test";
import { e2eCredentials } from "./global-setup";

test.describe.configure({ mode: "serial" });

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
  await page.goto("/restaurateur/commandes");
}

function orderCard(page: Page, numero: string) {
  return page
    .getByText(`#${numero}`, { exact: true })
    .locator("xpath=ancestor::div[contains(@class, 'overflow-hidden')][1]");
}

async function updateOrderStatus(page: Page, action: () => Promise<void>) {
  const responsePromise = page.waitForResponse(
    (response) =>
      response.request().method() === "PATCH" &&
      response.url().includes("/api/commandes/") &&
      response.url().endsWith("/statut"),
  );
  await action();
  expect((await responsePromise).ok()).toBeTruthy();
}

test("un restaurateur traite une commande de la réception à l'encaissement", async ({ page }) => {
  await connectRestaurateur(page);

  await expect(page.getByText(e2eCredentials.commandeNumero)).toBeVisible();
  await expect(page.getByText("Client E2E", { exact: true })).toBeVisible();

  await updateOrderStatus(page, () =>
    orderCard(page, e2eCredentials.commandeNumero)
      .getByRole("button", { name: "Accepter" })
      .click(),
  );
  await expect(
    orderCard(page, e2eCredentials.commandeNumero).getByRole("button", {
      name: "Marquer prête",
    }),
  ).toBeVisible();

  await updateOrderStatus(page, () =>
    orderCard(page, e2eCredentials.commandeNumero)
      .getByRole("button", { name: "Marquer prête" })
      .click(),
  );
  await expect(
    orderCard(page, e2eCredentials.commandeNumero).getByRole("button", {
      name: "Encaisser",
    }),
  ).toBeVisible();

  await updateOrderStatus(page, () =>
    orderCard(page, e2eCredentials.commandeNumero)
      .getByRole("button", { name: "Encaisser" })
      .click(),
  );
  await expect(orderCard(page, e2eCredentials.commandeNumero)).not.toBeVisible({
    timeout: 10_000,
  });
});

test("une commande annulée quitte le service et reste retrouvable dans l'historique", async ({ page }) => {
  await connectRestaurateur(page);

  await orderCard(page, e2eCredentials.commandeAnnuleeNumero)
    .getByRole("button", { name: "Refuser" })
    .click();
  await updateOrderStatus(page, () =>
    page.getByRole("button", { name: "Confirmer l'annulation" }).click(),
  );
  await expect(orderCard(page, e2eCredentials.commandeAnnuleeNumero)).not.toBeVisible({
    timeout: 10_000,
  });

  await page.getByRole("tab", { name: "Historique" }).click();
  await page
    .getByLabel("Rechercher une commande terminée")
    .fill(e2eCredentials.commandeAnnuleeNumero);
  await expect(
    page.getByText(`#${e2eCredentials.commandeAnnuleeNumero}`, { exact: true }),
  ).toBeVisible({ timeout: 10_000 });

  await page.getByRole("combobox", { name: "Filtrer par statut" }).click();
  await page.getByRole("option", { name: "Annulées" }).click();
  await expect(page).toHaveURL(/historyStatus=annulee/);
});

test("une livraison suit son cycle dédié jusqu’à la remise au client", async ({ page }) => {
  await connectRestaurateur(page);

  await updateOrderStatus(page, () =>
    orderCard(page, e2eCredentials.commandeLivraisonNumero)
      .getByRole("button", { name: "Accepter" })
      .click(),
  );
  await updateOrderStatus(page, () =>
    orderCard(page, e2eCredentials.commandeLivraisonNumero)
      .getByRole("button", { name: "Marquer prête" })
      .click(),
  );
  await expect(
    orderCard(page, e2eCredentials.commandeLivraisonNumero).getByRole("button", {
      name: "Voir détails",
    }),
  ).toBeEnabled({ timeout: 10_000 });
  await orderCard(page, e2eCredentials.commandeLivraisonNumero)
    .getByRole("button", { name: "Voir détails" })
    .click();

  await page.getByRole("button", { name: "Assigner un livreur" }).click();
  await page.getByRole("combobox").click();
  await page.getByRole("option", { name: /Livreur E2E/ }).click();
  await page.getByRole("button", { name: "Assigner", exact: true }).click();
  await expect(page.getByText("Livreur E2E", { exact: true })).toBeVisible();

  const closeDeliveryStatus = await page.evaluate(async () => {
    const commandeId = window.location.pathname.split("/").pop();
    const response = await fetch(`/api/commandes/${commandeId}/statut`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ statut: "servie" }),
    });
    return response.status;
  });
  expect(closeDeliveryStatus).toBe(422);

  await page.getByRole("button", { name: "Démarrer la livraison" }).click();
  await expect(
    page.getByRole("button", { name: "Confirmer la livraison" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Confirmer la livraison" }).click();
  await expect(page.getByText("Servie", { exact: true })).toBeVisible();
});
