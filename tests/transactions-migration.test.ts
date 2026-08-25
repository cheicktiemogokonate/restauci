import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Bloc 7 financial migration", () => {
  const migration = readFileSync(
    "drizzle/migrations/0016_transactions_payments_mvp.sql",
    "utf8",
  );

  it("replaces the legacy payment table with one active source", () => {
    expect(migration).toContain('DROP TABLE "paiements"');
    expect(migration).toContain('CREATE TABLE "transactions"');
    expect(migration).toContain('CREATE TABLE "payments"');
  });

  it("uses restrictive financial foreign keys and exact FCFA amounts", () => {
    expect(migration).toMatch(/payments_transaction_id_transactions_id_fk[\s\S]*ON DELETE restrict/i);
    expect(migration).toContain('"amount_fcfa" integer NOT NULL');
    expect(migration).not.toMatch(/amount_fcfa[^\n]*\*\s*100/i);
  });

  it("enforces source, provider and lifecycle coherence", () => {
    expect(migration).toContain("transactions_source_coherent");
    expect(migration).toContain("payments_provider_reference_unique");
    expect(migration).toContain("payments_provider_reference_coherent");
    expect(migration).toContain("payments_network_coherent");
    expect(migration).toContain("payments_lifecycle_coherent");
  });
});
