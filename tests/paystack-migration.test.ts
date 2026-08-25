import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Bloc 8 Paystack migration", () => {
  const migration = readFileSync("drizzle/migrations/0017_paystack_mvp.sql", "utf8");
  it("ajoute l’état non opérationnel et les provider accounts contraints", () => {
    expect(migration).toContain("en_attente_paiement");
    expect(migration).toContain('CREATE TABLE "payment_provider_accounts"');
    expect(migration).toContain("payment_provider_accounts_partner_provider_unique");
    expect(migration).toContain("payment_provider_accounts_provider_reference_unique");
  });
  it("lie une seule réservation recovery au Payment source", () => {
    expect(migration).toContain('"recovery_settlement_id"');
    expect(migration).toContain("payments_recovery_settlement_unique");
  });
  it("ne contient aucune conversion ×100 hors adapter", () => {
    expect(migration).not.toMatch(/amount[^\n]*\*\s*100/i);
  });
});
