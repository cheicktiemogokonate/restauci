import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("partner identity KYC migration", () => {
  const migration = readFileSync("drizzle/migrations/0019_partner_identity_kyc.sql", "utf8");

  it("creates one constrained verification per Partner Account", () => {
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS "partner_identity_verifications"');
    expect(migration).toContain("partner_identity_verifications_partner_unique");
    expect(migration).toContain("partner_identity_verifications_lifecycle_coherent");
    expect(migration).toContain("ON DELETE restrict");
  });

  it("keeps private document metadata relational and constrained", () => {
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS "partner_identity_documents"');
    expect(migration).toContain("partner_identity_documents_verification_side_unique");
    expect(migration).toContain("partner_identity_documents_content_type_valid");
    expect(migration).not.toContain("public_url");
  });

  it("adds only the two manual review audit actions", () => {
    expect(migration).toContain("identity_verification_verified");
    expect(migration).toContain("identity_verification_rejected");
  });
});
