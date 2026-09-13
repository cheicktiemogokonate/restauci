import { expect, test, type Page } from "@playwright/test";
import { e2eCredentials } from "./global-setup";

test.skip(
  process.env.E2E_KYC_INLINE !== "true",
  "La preuve KYC privée réelle est exécutée séparément de la suite déterministe.",
);

async function connectAdmin(page: Page) {
  const response = await page.request.post("/api/auth/login", {
    data: {
      email: e2eCredentials.adminEmail,
      password: e2eCredentials.adminPassword,
    },
  });
  expect(response.ok()).toBeTruthy();
}

test("le justificatif KYC assaini reste consultable inline sans téléchargement", async ({
  page,
}) => {
  await connectAdmin(page);
  await page.goto("/admin/verifications?status=verified&search=Restaurateur%20E2E");

  const row = page.getByRole("row").filter({ hasText: "Restaurateur E2E" });
  await row.getByRole("link", { name: "Examiner" }).click();

  await expect(page.getByText("Consultation privée, sans téléchargement")).toBeVisible();
  await expect(page.getByRole("link", { name: /télécharger/i })).toHaveCount(0);

  const preview = page.getByRole("img", {
    name: "Justificatif d’identité — Recto",
  });
  await expect(preview).toBeVisible();
  await expect
    .poll(() =>
      preview.evaluate((element: HTMLImageElement) =>
        element.complete ? element.naturalWidth : 0,
      ),
    )
    .toBeGreaterThan(0);

  const source = await preview.getAttribute("src");
  expect(source).toMatch(/^\/api\/admin\/identity\/documents\//);
  const documentResponse = await page.request.get(source!);
  expect(documentResponse.status()).toBe(200);
  expect(documentResponse.headers()["content-type"]).toBe("image/png");
  expect(documentResponse.headers()["content-disposition"]).toMatch(/^inline;/);
  expect(documentResponse.headers()["content-disposition"]).not.toContain("attachment");
  expect(documentResponse.headers()["cache-control"]).toContain("no-store");
  expect(documentResponse.headers()["x-frame-options"]).toBe("SAMEORIGIN");
  expect(documentResponse.headers()["content-security-policy"]).toBe(
    "sandbox; frame-ancestors 'self'",
  );

  await page.getByRole("tab", { name: "Verso" }).click();
  const pdfPreview = page.getByTitle("Aperçu du justificatif — Verso");
  await expect(pdfPreview).toBeVisible();
  const pdfSource = await pdfPreview.getAttribute("src");
  expect(pdfSource).toMatch(/^\/api\/admin\/identity\/documents\/.+#toolbar=0&navpanes=0$/);
  const pdfResponse = await page.request.get(pdfSource!);
  expect(pdfResponse.status()).toBe(200);
  expect(pdfResponse.headers()["content-type"]).toBe("application/pdf");
  expect(pdfResponse.headers()["content-disposition"]).toMatch(/^inline;/);
  expect(pdfResponse.headers()["content-disposition"]).not.toContain("attachment");
  expect(pdfResponse.headers()["x-frame-options"]).toBe("SAMEORIGIN");
  expect(pdfResponse.headers()["content-security-policy"]).toBe(
    "sandbox; frame-ancestors 'self'",
  );
});
