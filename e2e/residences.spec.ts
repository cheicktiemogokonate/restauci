import {
  expect,
  test,
  type BrowserContext,
  type Locator,
  type Page,
} from "@playwright/test";
import seedE2EData, { e2eCredentials } from "./global-setup";

const residenceTitle = "Résidence Laguna E2E";
const rejectionReason =
  "Merci de préciser davantage les équipements et les conditions d’accueil.";

test.describe.configure({ retries: 0 });
test.beforeAll(seedE2EData);

async function clearPartnerSession(context: BrowserContext) {
  await context.clearCookies();
}

async function connectPartner(
  page: Page,
  email: string,
  password: string,
) {
  const response = await page.request.post("/api/auth/login", {
    data: { email, password },
  });
  expect(
    response.ok(),
    `Connexion partenaire refusée (${response.status()}): ${await response.text()}`,
  ).toBeTruthy();
  expect(
    (await page.context().cookies()).some((cookie) =>
      cookie.name.endsWith("restauci_session"),
    ),
  ).toBeTruthy();
  const sessionProbe = await page.request.get("/api/notifications/count");
  expect(
    sessionProbe.status(),
    `Session partenaire inutilisable (${sessionProbe.status()}): ${await sessionProbe.text()}`,
  ).not.toBe(401);
}

async function connectOwner(page: Page) {
  await connectPartner(
    page,
    e2eCredentials.residenceOwnerEmail,
    e2eCredentials.residenceOwnerPassword,
  );
}

async function connectAdmin(page: Page) {
  await connectPartner(
    page,
    e2eCredentials.adminEmail,
    e2eCredentials.adminPassword,
  );
}

async function connectClient(page: Page) {
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
  await goTo(page, "/client/login");
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
  await goTo(page, "/client");
  await expect(page).toHaveURL(/\/client$/);
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

async function goTo(page: Page, url: string) {
  await expect(async () => {
    const response = await page.goto(url, { waitUntil: "domcontentloaded" });
    expect(response?.ok(), `Navigation ${url} invalide`).toBe(true);
  }).toPass({ timeout: 90_000, intervals: [250, 1_000, 2_000, 5_000] });
  await page.locator('html[data-e2e-hydrated="true"]').waitFor({
    state: "attached",
    timeout: 90_000,
  });
  await page
    .getByRole("main", { name: "Chargement de l’espace Résidences" })
    .waitFor({ state: "detached", timeout: 90_000 });
}

async function clickUntilVisible(
  trigger: Locator,
  outcome: Locator,
  timeout = 60_000,
) {
  await expect(async () => {
    if (await outcome.isVisible().catch(() => false)) return;
    await trigger.click();
    await expect(outcome).toBeVisible({ timeout: 5_000 });
  }).toPass({ timeout, intervals: [500, 1_000, 2_000] });
}

async function waitForReactHandler(locator: Locator) {
  await locator.waitFor({ state: "visible" });
  await expect
    .poll(
      () =>
        locator.evaluate((element) =>
          Object.getOwnPropertyNames(element).some(
            (key) =>
              key.startsWith("__reactProps$") ||
              key.startsWith("__reactFiber$"),
          ),
        ),
      { timeout: 90_000 },
    )
    .toBe(true);
}

async function openAdminResidence(page: Page, status: string) {
  await goTo(page, `/admin/residences?status=${status}`);
  const row = page.getByRole("row").filter({ hasText: residenceTitle });
  await expect(row).toBeVisible();
  await row.getByRole("link", { name: "Examiner" }).click();
}

test("parcours résidence complet : création, modération, publication, paiement et exploitation", async ({
  baseURL,
  context,
  page,
}) => {
  // Neon is the shared test database and can occasionally take several seconds
  // per connection/query. Keep a generous ceiling for this intentionally long
  // multi-role journey; individual assertions still retain their 30 s timeout.
  test.setTimeout(900_000);
  page.setDefaultTimeout(30_000);
  if (!baseURL) throw new Error("baseURL Playwright est requise.");
  await context.grantPermissions(["geolocation"], {
    origin: baseURL,
  });
  await context.setGeolocation({
    latitude: 7.6817075,
    longitude: -5.0166143,
  });

  // Propriétaire : création réelle de la fiche avec photo et géolocalisation.
  await connectOwner(page);
  await goTo(page, "/partenaire/residences/nouvelle");
  const useLocation = page.getByRole("button", { name: "Utiliser ma position" });
  const locationSaved = page.getByText("Position enregistrée automatiquement.");
  await waitForReactHandler(useLocation);
  await clickUntilVisible(useLocation, locationSaved);
  await page.getByLabel("Nom de la résidence").fill(residenceTitle);
  await page
    .getByLabel("Description")
    .fill(
      "Appartement lumineux avec deux chambres, cuisine équipée, gardiennage et accès facile au centre d’Abidjan.",
    );
  await page.getByLabel("Prix par nuit (FCFA)").fill("45000");
  await page.getByLabel("Nombre maximal de voyageurs").fill("4");
  await page
    .getByLabel("Adresse ou point de repère")
    .fill("Quartier Commerce, Bouaké");
  await page.getByLabel("Ville ou localité").fill("Bouaké");
  await page
    .locator('input[type="file"]')
    .setInputFiles("public/assets/images/restaurant_exterior_night_1781800314693.jpg");
  await expect(page.getByText("Photo ajoutée.")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Retirer la photo 1" }),
  ).toBeVisible();
  await page
    .getByRole("checkbox", { name: /Demander la vérification de la fiche/ })
    .check();
  const submitResidence = page.getByRole("button", {
    name: "Enregistrer et demander la vérification",
  });
  await expect(submitResidence).toBeEnabled();
  await submitResidence.click();
  await expect(
    page.getByText("Résidence créée et transmise pour vérification."),
  ).toBeVisible({ timeout: 90_000 });
  await goTo(page, "/partenaire/residences");
  await expect(page.getByText(residenceTitle, { exact: true }).first()).toBeVisible();
  await expect(page.getByText("En vérification", { exact: true })).toBeVisible();

  // Administration : demande de correction, puis validation après resoumission.
  await clearPartnerSession(context);
  await connectAdmin(page);
  await openAdminResidence(page, "pending");
  await page.getByLabel("Motif si correction demandée").fill(rejectionReason);
  await page.getByRole("button", { name: "Demander une correction" }).click();
  await expect(page.getByText("À corriger", { exact: true })).toBeVisible({
    timeout: 90_000,
  });

  await clearPartnerSession(context);
  await connectOwner(page);
  await goTo(page, "/partenaire/residences");
  await expect(page.getByText("À corriger", { exact: true })).toBeVisible();
  const correctionHref = await page
    .getByRole("link", { name: "Corriger" })
    .getAttribute("href");
  expect(correctionHref).toMatch(/^\/partenaire\/residences\/[a-f0-9-]+$/);
  await goTo(page, correctionHref!);
  await expect(page.getByText(rejectionReason)).toBeVisible();
  const updateLocation = page.getByRole("button", { name: "Utiliser ma position" });
  const updateLocationSaved = page.getByText(
    "Position enregistrée automatiquement.",
  );
  await clickUntilVisible(updateLocation, updateLocationSaved);
  await page
    .getByLabel("Description")
    .fill(
      "Appartement lumineux avec deux chambres climatisées, cuisine équipée, Wi-Fi, gardiennage permanent et consignes d’arrivée détaillées.",
    );
  await expect(page.getByLabel("Description")).toHaveValue(
    "Appartement lumineux avec deux chambres climatisées, cuisine équipée, Wi-Fi, gardiennage permanent et consignes d’arrivée détaillées.",
  );
  await page
    .getByRole("button", { name: "Enregistrer et demander la vérification" })
    .click();
  await expect(
    page.getByText(
      "Modifications enregistrées et transmises pour une nouvelle vérification.",
    ),
  ).toBeVisible({ timeout: 90_000 });
  await goTo(page, "/partenaire/residences");

  await clearPartnerSession(context);
  await connectAdmin(page);
  await openAdminResidence(page, "pending");
  const approveResidence = page.getByRole("button", {
    name: "Valider la résidence",
  });
  await waitForReactHandler(approveResidence);
  await approveResidence.click();
  await expect(page.getByText("Validée", { exact: true })).toBeVisible({
    timeout: 90_000,
  });

  // Propriétaire : publication volontaire après validation administrative.
  await clearPartnerSession(context);
  await connectOwner(page);
  await goTo(page, "/partenaire/residences");
  const publishResidence = page.getByRole("button", {
    name: "Publier la résidence",
  });
  const publicLink = page.getByRole("link", { name: "Voir en public" });
  await waitForReactHandler(publishResidence);
  await publishResidence.click();
  await expect(publicLink).toBeVisible({ timeout: 90_000 });
  const publicHref = await publicLink.getAttribute("href");
  expect(publicHref).toMatch(/^\/residences\//);

  // Administration : la suspension masque la fiche, la réactivation la restaure.
  await clearPartnerSession(context);
  await connectAdmin(page);
  await openAdminResidence(page, "approved");
  await page
    .getByLabel("Motif de suspension")
    .fill("Contrôle administratif temporaire effectué pendant le test E2E.");
  const suspendResidence = page.getByRole("button", {
    name: "Suspendre la résidence",
  });
  await waitForReactHandler(suspendResidence);
  await suspendResidence.click();
  await expect(page.getByText("Suspendue", { exact: true })).toBeVisible({
    timeout: 90_000,
  });
  await expect
    .poll(
      async () => (await page.request.get(publicHref!)).status(),
      { timeout: 90_000 },
    )
    .toBe(404);

  const reactivateResidence = page.getByRole("button", {
    name: "Réactiver la résidence",
  });
  await waitForReactHandler(reactivateResidence);
  await reactivateResidence.click();
  await expect(page.getByText("Validée", { exact: true })).toBeVisible({
    timeout: 90_000,
  });
  await expect
    .poll(
      async () => (await page.request.get(publicHref!)).status(),
      { timeout: 90_000 },
    )
    .toBe(200);

  // Client : recherche, devis, paiement Paystack de test et confirmation.
  await clearPartnerSession(context);
  await connectClient(page);
  await goTo(page, "/residences");
  await expect(page.getByText(residenceTitle, { exact: true })).toBeVisible();
  const discoveryHref = await page
    .getByRole("link")
    .filter({ hasText: residenceTitle })
    .getAttribute("href");
  expect(discoveryHref).toMatch(/^\/api\/v1\/public\/discovery\/open\?/);
  const discoveryResponse = await page.request.get(discoveryHref!, {
    maxRedirects: 0,
  });
  expect(discoveryResponse.status()).toBe(307);
  const publicResidenceUrl = discoveryResponse.headers().location;
  expect(publicResidenceUrl).toBeTruthy();
  const parsedPublicResidenceUrl = new URL(publicResidenceUrl!);
  expect(parsedPublicResidenceUrl.origin).toBe(new URL(baseURL).origin);
  expect(parsedPublicResidenceUrl.pathname).toMatch(
    /^\/residences\/residence-laguna-e2e-/,
  );
  await goTo(page, publicResidenceUrl);
  await expect(page).toHaveURL(/\/residences\/residence-laguna-e2e-/);
  await expect(page.getByRole("heading", { name: residenceTitle })).toBeVisible();

  const checkIn = addDays(7);
  const checkOut = addDays(10);
  await waitForReactHandler(
    page.getByRole("button", {
      name: "Choisir les dates d’arrivée et de départ",
    }),
  );
  await chooseRange(page, checkIn, checkOut);
  await page.getByRole("button", { name: "Vérifier les dates" }).click();
  await expect(page.getByText("Dates disponibles")).toBeVisible({
    timeout: 90_000,
  });
  await page.getByRole("button", { name: "Réserver et payer" }).click();
  await expect(page).toHaveURL(/127\.0\.0\.1:4100\/checkout/, {
    timeout: 90_000,
  });
  const checkoutUrl = page.url();

  // Propriétaire : une réservation encore impayée peut être déplacée à durée
  // constante et le client est informé.
  await clearPartnerSession(context);
  await connectOwner(page);
  await goTo(page, "/partenaire/reservations");
  await expect(page.getByText("Paiement en attente", { exact: true }).first()).toBeVisible();
  const editReservation = page.getByRole("button", { name: "Modifier" });
  const editReservationDialog = page.getByRole("dialog", {
    name: "Modifier la réservation",
  });
  await waitForReactHandler(editReservation);
  await clickUntilVisible(editReservation, editReservationDialog);
  const updatedCheckIn = addDays(8);
  const updatedCheckOut = addDays(11);
  await editReservationDialog
    .getByRole("button", {
      name: "Choisir les dates d’arrivée et de départ",
    })
    .click();
  await page.getByRole("button", { name: "Effacer" }).click();
  await chooseRange(page, updatedCheckIn, updatedCheckOut);
  await page.getByLabel("Nombre de voyageurs").fill("3");
  await page.getByRole("button", { name: "Enregistrer et informer" }).click();
  await expect(page.getByText("Réservation modifiée et client informé.")).toBeVisible({
    timeout: 90_000,
  });

  // Client : le lien de paiement reste valide car la durée et le montant n’ont
  // pas changé.
  await clearPartnerSession(context);
  await connectClient(page);
  await page.goto(checkoutUrl, { waitUntil: "domcontentloaded" });
  await page.getByRole("link", { name: "Confirmer le paiement de test" }).click();
  if (!/\/reservations\/[a-f0-9-]+\?payment=confirmed/.test(page.url())) {
    const reference = new URL(checkoutUrl).searchParams.get("reference");
    if (!reference) throw new Error("Référence Paystack E2E introuvable.");
    const callback = await page.request.get(
      `/api/payments/paystack/callback?reference=${encodeURIComponent(reference)}`,
      { maxRedirects: 0, timeout: 90_000 },
    );
    expect(callback.status()).toBe(307);
    const returnUrl = callback.headers().location;
    if (!returnUrl) throw new Error("Retour Paystack E2E introuvable.");
    await goTo(page, returnUrl);
  }
  await expect(page).toHaveURL(
    /\/reservations\/[a-f0-9-]+\?payment=confirmed/,
    { timeout: 90_000 },
  );
  await expect(page.getByText("Confirmée", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: residenceTitle, level: 1 }),
  ).toBeVisible();

  // Propriétaire : la réservation payée apparaît et le calendrier reste gérable.
  await clearPartnerSession(context);
  await connectOwner(page);
  await goTo(page, "/partenaire/reservations");
  await expect(page.getByText(residenceTitle, { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Client E2E", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Confirmée", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Modifier" })).toHaveCount(0);
  await page.getByRole("button", { name: "Annuler" }).click();
  await page
    .getByLabel("Motif communiqué au client")
    .fill("Travaux urgents empêchant l’accueil dans de bonnes conditions.");
  await page
    .getByLabel(
      "Je confirme l’annulation et la création de l’obligation de remboursement.",
    )
    .check();
  await page.getByRole("button", { name: "Annuler et informer" }).click();
  await expect(
    page.getByText(
      "Réservation annulée et client informé. Le remboursement intégral est enregistré dans le suivi financier.",
    ),
  ).toBeVisible({ timeout: 90_000 });
  await expect(page.getByText("Annulée", { exact: true }).first()).toBeVisible();

  const calendarTab = page.getByRole("tab", { name: "Calendrier" });
  await waitForReactHandler(calendarTab);
  await clickUntilVisible(
    calendarTab,
    page.getByRole("heading", { name: "Indisponibilités manuelles" }),
  );
  const blockStart = addDays(14);
  const blockEnd = addDays(16);
  await chooseRange(page, blockStart, blockEnd);
  await page.getByLabel(/Motif interne/).fill("Travaux E2E");
  await page.getByRole("button", { name: "Bloquer cette période" }).click();
  await expect(
    page.getByText("Période indisponible ajoutée.", { exact: true }),
  ).toBeVisible({ timeout: 90_000 });
  await page.getByRole("button", { name: "Supprimer cette indisponibilité" }).click();
  await page
    .getByRole("alertdialog", { name: "Libérer cette période ?" })
    .getByRole("button", { name: "Libérer la période" })
    .click();
  await expect(
    page.getByText("Période supprimée.", { exact: true }),
  ).toBeVisible({ timeout: 90_000 });
});
