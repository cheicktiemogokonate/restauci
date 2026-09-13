import {
  expect,
  test,
  type Locator,
  type Page,
} from "@playwright/test";
import { e2eCredentials } from "./global-setup";

test.skip(
  process.env.E2E_PAYSTACK_LIVE !== "true",
  "Le paiement Paystack TEST réel est exécuté séparément de la suite déterministe.",
);
test.describe.configure({ mode: "serial", retries: 0 });

async function login(page: Page, email: string, password: string) {
  const response = await page.request.post("/api/auth/login", {
    data: { email, password },
  });
  expect(
    response.ok(),
    `Connexion partenaire refusée (${response.status()}): ${await response.text()}`,
  ).toBeTruthy();
}

async function loginClient(page: Page) {
  const response = await page.request.post("/api/v1/client/auth/login", {
    data: {
      telephone: e2eCredentials.clientPhone,
      password: e2eCredentials.clientPassword,
      tokenTransport: "json",
    },
  });
  const body = (await response.json()) as {
    data?: {
      client: { id: string; nom: string; telephone: string; email?: string | null };
      tokens: { accessToken: string };
    };
  };
  expect(response.ok(), `Connexion client refusée (${response.status()})`).toBeTruthy();
  expect(body.data).toBeTruthy();
  await page.goto("/client/login");
  await page.evaluate(
    ({ accessToken, user }) => {
      localStorage.setItem(
        "restauci-client-auth",
        JSON.stringify({
          state: { accessToken, user, isAuthenticated: true },
          version: 2,
        }),
      );
    },
    {
      accessToken: body.data!.tokens.accessToken,
      user: body.data!.client,
    },
  );
  return body.data!.tokens.accessToken;
}

function addDays(days: number) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return date;
}

function calendarDay(date: Date) {
  return date.toLocaleDateString("fr");
}

async function clickUntilVisible(trigger: Locator, outcome: Locator) {
  await expect(async () => {
    if (await outcome.isVisible().catch(() => false)) return;
    await trigger.click();
    await expect(outcome).toBeVisible({ timeout: 5_000 });
  }).toPass({ timeout: 60_000, intervals: [500, 1_000, 2_000] });
}

async function chooseRange(page: Page, checkIn: Date, checkOut: Date) {
  const checkInDay = page
    .locator(`[data-day="${calendarDay(checkIn)}"]`)
    .first();
  await clickUntilVisible(
    page.getByRole("button", {
      name: "Choisir les dates d’arrivée et de départ",
    }),
    checkInDay,
  );
  await checkInDay.click();
  await expect(async () => {
    await page
      .locator(`[data-day="${calendarDay(checkOut)}"]`)
      .first()
      .click({ timeout: 5_000 });
  }).toPass({ timeout: 30_000, intervals: [100, 250, 500] });
}

async function completeOrangeMoneyCheckout(page: Page, amountFcfa: number) {
  await expect(page).toHaveURL(/^https:\/\/checkout\.paystack\.com\//, {
    timeout: 90_000,
  });
  const cloudflareChallenge = page.getByRole("heading", {
    name: "Performing security verification",
  });
  const changePaymentMode = page.getByRole("button", {
    name: /Modifier le Mode de Paiement/i,
  });
  const orange = page.getByRole("link", { name: /Payer avec Orange/i });
  const checkoutReady = changePaymentMode.or(orange);
  const checkoutState = await Promise.race([
    cloudflareChallenge
      .waitFor({ state: "visible", timeout: 30_000 })
      .then(() => "cloudflare" as const),
    checkoutReady
      .first()
      .waitFor({ state: "visible", timeout: 30_000 })
      .then(() => "ready" as const),
  ]);
  if (checkoutState === "cloudflare") {
    throw new Error(
      "Paystack a présenté sa vérification Cloudflare au navigateur automatisé ; relancer ce pilote dans un navigateur interactif.",
    );
  }

  if (!(await orange.isVisible().catch(() => false))) {
    await changePaymentMode.click();
  }
  await orange.click();
  await page.getByRole("textbox", { name: "Phone number" }).fill("0700000000");
  await page
    .getByRole("button", {
      name: new RegExp(`Payer ${amountFcfa.toLocaleString("fr-FR").replace(/\s/g, "[\\s\\u202f]")} XOF`, "i"),
    })
    .click();
  await page.getByRole("button", { name: "Entrez le code généré" }).click();
  const otp = page.getByRole("textbox", {
    name: "Veuillez saisir le code à 4 chiffres",
  });
  await expect(otp).toBeVisible({ timeout: 90_000 });
  await otp.fill("1234");
  await page.getByRole("button", { name: "Autoriser" }).click();
}

test("un propriétaire Résidence provisionne automatiquement sa destination Wave", async ({
  page,
}) => {
  await login(
    page,
    e2eCredentials.residenceOwnerEmail,
    e2eCredentials.residenceOwnerPassword,
  );
  await page.goto("/partenaire/verification");

  const activeStatus = page.getByText("Actif", { exact: true });
  if (!(await activeStatus.isVisible().catch(() => false))) {
    await page
      .getByRole("button", { name: "Choisir l’établissement de versement" })
      .click();
    await page.getByRole("option", { name: /Wave/i }).click();
    await page
      .getByLabel("Numéro Mobile Money")
      .fill("0700000000");
    await page
      .getByRole("button", { name: "Créer mon compte de versement" })
      .click();
  }

  await expect(activeStatus).toBeVisible({ timeout: 90_000 });
  await expect(page.getByText("•••• 0000", { exact: false })).toBeVisible();
});

test("une réservation Résidence est payée avec le split Paystack TEST et visible de bout en bout", async ({
  context,
  page,
}) => {
  test.setTimeout(360_000);
  const clientAccessToken = await loginClient(page);
  await page.goto(`/residences/${e2eCredentials.paystackResidenceSlug}`);
  await expect(
    page.getByRole("heading", { name: e2eCredentials.paystackResidenceTitle }),
  ).toBeVisible();

  await chooseRange(page, addDays(7), addDays(10));
  await page.getByRole("button", { name: "Vérifier les dates" }).click();
  await expect(page.getByText("Dates disponibles")).toBeVisible({
    timeout: 90_000,
  });
  await page.getByRole("button", { name: "Réserver et payer" }).click();
  await completeOrangeMoneyCheckout(page, 135_000);

  // Le bac à sable Orange confirme parfois le paiement par webhook sans
  // rediriger. La projection Toutci est donc relue après le délai fournisseur.
  await page.waitForTimeout(12_000);
  await page.goto("/reservations");
  const reservation = page
    .getByRole("link")
    .filter({ hasText: e2eCredentials.paystackResidenceTitle });
  await expect(reservation).toContainText("Confirmée", { timeout: 90_000 });
  const reservationHref = await reservation.getAttribute("href");
  expect(reservationHref).toMatch(/^\/reservations\/[a-f0-9-]+$/);
  const reservationId = reservationHref!.split("/").at(-1)!;

  const clientNotifications = await page.request.get(
    "/api/v1/client/notifications?limit=20",
    { headers: { Authorization: `Bearer ${clientAccessToken}` } },
  );
  expect(clientNotifications.ok()).toBeTruthy();
  expect(await clientNotifications.text()).toContain("Séjour confirmé");

  await context.clearCookies();
  await login(
    page,
    e2eCredentials.residenceOwnerEmail,
    e2eCredentials.residenceOwnerPassword,
  );
  await page.goto("/partenaire/reservations");
  const ownerReservation = page
    .getByText(e2eCredentials.paystackResidenceTitle, { exact: true })
    .first();
  await expect(ownerReservation).toBeVisible();
  await expect(page.getByText("Confirmée", { exact: true }).first()).toBeVisible();
  const partnerNotifications = await page.request.get("/api/notifications?limit=20");
  expect(partnerNotifications.ok()).toBeTruthy();
  expect(await partnerNotifications.text()).toContain("Réservation payée");

  await context.clearCookies();
  await login(page, e2eCredentials.adminEmail, e2eCredentials.adminPassword);
  await page.goto("/admin/abonnements?section=finances");
  const financialRow = page.getByRole("row").filter({
    hasText: "Propriétaire Résidence E2E",
  });
  await expect(financialRow).toContainText("Réservation Résidence");
  await expect(financialRow).toContainText(/135[\s\u202f]000 FCFA/);

  await page.goto(`/admin/audit?ressource=${reservationId}`);
  const auditRow = page.getByRole("row").filter({
    hasText: "residence_reservation_confirmed",
  });
  await expect(auditRow).toContainText("Fournisseur externe");
  await expect(auditRow).toContainText(reservationId);
});

test("un abonnement Restaurant Croissance de 25 000 FCFA est confirmé par Paystack TEST", async ({
  page,
  context,
}) => {
  await login(page, e2eCredentials.email, e2eCredentials.password);
  await page.goto("/restaurateur/facturation");
  await expect(page.getByText("25 000 FCFA")).toBeVisible();

  const croissanceCard = page
    .getByText("Croissance", { exact: true })
    .first()
    .locator("xpath=ancestor::*[.//button[contains(normalize-space(.), 'Choisir cette offre')]][1]");
  await croissanceCard.getByRole("button", { name: "Choisir cette offre" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Confirmer la demande" }).click();

  await completeOrangeMoneyCheckout(page, 25_000);

  // Le bac à sable Orange confirme parfois le paiement par webhook sans
  // rediriger le checkout. Relire l'état canonique de Toutci après le délai
  // fournisseur prouve la confirmation sans dépendre de ce retour visuel.
  await page.waitForTimeout(12_000);
  await page.goto("/restaurateur/facturation");
  await expect(page.getByText("Croissance", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Offre actuelle" })).toBeVisible();

  await context.clearCookies();
  await login(page, e2eCredentials.adminEmail, e2eCredentials.adminPassword);
  await page.goto("/admin/abonnements?section=abonnes");
  const subscriber = page.getByRole("row").filter({ hasText: "Restaurateur E2E" });
  await expect(subscriber).toContainText("Croissance");
  await expect(subscriber).toContainText("Actif");
});
