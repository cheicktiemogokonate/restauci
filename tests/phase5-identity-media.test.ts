import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Phase 5 — Identity et Media", () => {
  const migration = readFileSync(
    "drizzle/migrations/0038_identity_media_lifecycle.sql",
    "utf8",
  );
  const adminDocumentRoute = readFileSync(
    "src/app/api/admin/identity/documents/[id]/route.ts",
    "utf8",
  );
  const adminReviewPage = readFileSync(
    "src/app/(dashboard)/admin/verifications/[id]/page.tsx",
    "utf8",
  );

  it("registers temporary and attached public assets with a constrained lifecycle", () => {
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS "public_media_assets"');
    expect(migration).toContain("public_media_assets_lifecycle_coherent");
    expect(migration).toContain("public_media_assets_cleanup_idx");
    expect(migration).toContain("'temporary', 'attached', 'deleting', 'deleted'");
  });

  it("keeps KYC preview inline, private, non-cacheable, and without a download action", () => {
    expect(adminDocumentRoute).toContain('"Content-Disposition": `inline;');
    expect(adminDocumentRoute).toContain('"Cache-Control": "private, no-store');
    expect(adminDocumentRoute).not.toContain("attachment;");
    expect(adminReviewPage).toContain("IdentityDocumentViewer");
    expect(adminReviewPage).not.toContain("Télécharger");
  });
});
