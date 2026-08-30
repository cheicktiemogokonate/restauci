import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("driver fixed compensation migration", () => {
  const migration = readFileSync(
    "drizzle/migrations/0033_driver_fixed_compensation.sql",
    "utf8",
  );

  it("stores only an optional positive fixed amount", () => {
    expect(migration).toContain('"fixed_delivery_compensation_fcfa" integer');
    expect(migration).toContain('"fixed_delivery_compensation_fcfa" > 0');
    expect(migration).not.toMatch(/percent|percentage|basis_points|bps/i);
  });

  it("snapshots the amount on offers and accepted deliveries", () => {
    expect(migration).toContain(
      'ALTER TABLE "delivery_offers"\n  ADD COLUMN IF NOT EXISTS "driver_compensation_amount_fcfa" integer',
    );
    expect(migration).toContain(
      'ALTER TABLE "livraisons"\n  ADD COLUMN IF NOT EXISTS "driver_compensation_amount_fcfa" integer',
    );
  });

  it("only permits a coherent declaration of payment on a delivered mission", () => {
    expect(migration).toContain(
      '"livraisons_driver_compensation_payment_coherent"',
    );
    expect(migration).toContain('"statut" = \'livree\'');
    expect(migration).toContain(
      '"driver_compensation_paid_by_user_id")\n      REFERENCES "users"("id") ON DELETE RESTRICT',
    );
  });
});
