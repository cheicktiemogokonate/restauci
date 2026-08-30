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
  expect(
    (await page.context().cookies()).some((cookie) =>
      cookie.name.endsWith("restauci_session")
    )
  ).toBeTruthy();
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

test("une livraison suit son cycle dédié jusqu’à la remise au client", async ({
  page,
  browser,
}) => {
  await connectRestaurateur(page);

  await updateOrderStatus(page, () =>
    orderCard(page, e2eCredentials.commandeLivraisonNumero)
      .getByRole("button", { name: "Accepter" })
      .click(),
  );
  await expect(
    orderCard(page, e2eCredentials.commandeLivraisonNumero).getByRole("button", {
      name: "Voir détails",
    }),
  ).toBeEnabled({ timeout: 10_000 });
  await Promise.all([
    page.waitForURL(/\/restaurateur\/commandes\/[0-9a-f-]{36}$/),
    orderCard(page, e2eCredentials.commandeLivraisonNumero)
      .getByRole("button", { name: "Voir détails" })
      .click(),
  ]);
  const orderId = page.url().split("/").pop();
  if (!orderId) throw new Error("Identifiant de commande E2E introuvable.");
  expect(orderId).toMatch(/^[0-9a-f-]{36}$/);

  await page.getByRole("button", { name: "Proposer à un livreur" }).click();
  await page.getByRole("combobox").click();
  await page.getByRole("option", { name: /Livreur E2E/ }).click();
  await page.getByRole("button", { name: "Envoyer la proposition" }).click();
  await expect(
    page.getByText("Proposition envoyée au livreur.", { exact: true }),
  ).toBeVisible();

  const driverContext = await browser.newContext();
  const driverPage = await driverContext.newPage();
  await driverPage.goto(`${new URL(page.url()).origin}/livreur`);
  await driverPage.getByLabel("Identifiant").fill(e2eCredentials.driverLogin);
  await driverPage.getByLabel("Mot de passe").fill(e2eCredentials.driverPassword);
  await driverPage.getByRole("button", { name: "Se connecter" }).click();
  await expect(
    driverPage.getByText("Nouvelle proposition", { exact: true }),
  ).toBeVisible();
  await expect(
    driverPage.getByText("Rémunération prévue", { exact: true }),
  ).toBeVisible();
  await expect(driverPage.getByText("300 FCFA", { exact: true })).toBeVisible();
  await driverPage.getByRole("button", { name: "Accepter" }).click();
  await expect(
    driverPage.getByText("Mission active", { exact: true }),
  ).toBeVisible();
  await expect(
    driverPage.getByRole("button", { name: "J’ai récupéré la commande" }),
  ).toBeDisabled();
  await expect(
    driverPage.getByText("Commande encore en préparation", { exact: true }),
  ).toBeVisible();

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

  await page.goto("/restaurateur/commandes");
  await updateOrderStatus(page, () =>
    orderCard(page, e2eCredentials.commandeLivraisonNumero)
      .getByRole("button", { name: "Marquer prête" })
      .click(),
  );

  await driverPage.getByRole("button", { name: "Actualiser" }).click();
  await expect(
    driverPage.getByRole("button", { name: "J’ai récupéré la commande" }),
  ).toBeEnabled();
  await driverPage
    .getByRole("button", { name: "J’ai récupéré la commande" })
    .click();
  await expect(
    driverPage.getByRole("button", { name: "Confirmer la remise" }),
  ).toBeVisible();

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
  const deliveryResponse = await page.request.get(
    `/api/v1/client/commandes/${orderId}/livraison`,
    {
      headers: {
        Authorization: `Bearer ${clientLoginBody.data.tokens.accessToken}`,
      },
    },
  );
  expect(deliveryResponse.ok()).toBeTruthy();
  const deliveryBody = (await deliveryResponse.json()) as {
    data: { proofCode: string | null };
  };
  expect(deliveryBody.data.proofCode).toMatch(/^\d{6}$/);

  await driverPage.getByRole("button", { name: "Confirmer la remise" }).click();
  await driverPage
    .getByLabel(/Code client/)
    .fill(deliveryBody.data.proofCode!);
  await driverPage.getByRole("button", { name: "Valider la remise" }).click();
  await expect(
    driverPage.getByText("Livraison terminée.", { exact: true }),
  ).toBeVisible();

  await page.goto(`/restaurateur/commandes/${orderId}`);
  await expect(page.getByText("Livrée", { exact: true })).toBeVisible();

  await page.goto("/restaurateur/livreurs");
  const driverRow = page.getByRole("row").filter({ hasText: "Livreur E2E" });
  await driverRow.getByRole("button", { name: "Rémunérations" }).click();
  const compensationDialog = page.getByRole("dialog", {
    name: "Suivi des rémunérations",
  });
  await expect(compensationDialog.getByText("300 FCFA", { exact: true }).first()).toBeVisible();
  await compensationDialog.getByRole("button", { name: "Déclarer tout réglé" }).click();
  await expect(
    page.getByText("300 FCFA déclarés réglés.", { exact: true }),
  ).toBeVisible();

  await driverRow.getByRole("button", { name: "Rémunérations" }).click();
  await expect(
    page.getByRole("dialog", { name: "Suivi des rémunérations" }).getByText(
      "Déclaré réglé",
      { exact: true },
    ),
  ).toBeVisible();
  await driverContext.close();
});
