import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("delivery driver V1 migration", () => {
  const migration = readFileSync(
    "drizzle/migrations/0031_delivery_driver_v1.sql",
    "utf8",
  );

  it("backfills opaque logins without inventing historical passwords", () => {
    expect(migration).toContain('ADD COLUMN IF NOT EXISTS "login_id"');
    expect(migration).toContain(
      'SET "login_id" = \'LIV-\' || upper(substr(replace("id", \'-\', \'\'), 1, 24))',
    );
    expect(migration).toContain('ADD COLUMN IF NOT EXISTS "password_hash" text');
    expect(migration).not.toMatch(/UPDATE "livreurs"[\s\S]*SET "password_hash"/);
  });

  it("prevents a driver from receiving concurrent active work or offers", () => {
    expect(migration).toContain('"livraisons_active_driver_unique"');
    expect(migration).toContain(
      '"statut" IN (\'assignee\', \'en_route\')',
    );
    expect(migration).toContain('"delivery_offers_pending_driver_unique"');
    expect(migration).toContain('"delivery_offers_pending_delivery_unique"');
  });

  it("creates an immutable operational event log", () => {
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS "delivery_events"');
    expect(migration).toContain("prevent_delivery_event_mutation");
    expect(migration).toContain("BEFORE UPDATE OR DELETE");
  });

  it("tracks client proof and exact cash custody separately", () => {
    expect(migration).toContain('"proof_code_digest" varchar(64)');
    expect(migration).toContain('"proof_code_nonce" varchar(32)');
    expect(migration).toContain('"proof_verified_at" timestamptz');
    expect(migration).toContain(
      'CREATE TABLE IF NOT EXISTS "driver_cash_collections"',
    );
    expect(migration).toContain(
      'CREATE TABLE IF NOT EXISTS "driver_cash_remittances"',
    );
    expect(migration).toContain(
      '"received_amount_fcfa" = "expected_amount_fcfa"',
    );
  });

  it("adds a third exclusive notification owner", () => {
    expect(migration).toContain(
      'num_nonnulls("user_id", "client_id", "driver_id") = 1',
    );
    expect(migration).toContain('"notifications_driver_id_livreurs_id_fk"');
    expect(migration).toContain(
      '"push_subscriptions_driver_id_livreurs_id_fk"',
    );
  });
});
