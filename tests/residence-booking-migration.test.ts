import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Bloc 9 residence booking migration", () => {
  const migration = readFileSync(
    "drizzle/migrations/0023_residence_booking.sql",
    "utf8",
  );

  it("creates normalized reservations and owner unavailability periods", () => {
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS "residence_reservations"');
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS "residence_unavailable_periods"');
    expect(migration).toContain('"check_in" date NOT NULL');
    expect(migration).toContain('"check_out" date NOT NULL');
    expect(migration).not.toMatch(/availability[^\n]*json/i);
  });

  it("adds one explicit financial source per reservation", () => {
    expect(migration).toContain("ALTER TYPE \"transaction_type\" ADD VALUE IF NOT EXISTS 'reservation_residence'");
    expect(migration).toContain('"transactions_residence_reservation_unique"');
    expect(migration).toContain('"commissions_residence_reservation_unique"');
    expect(migration).toContain('"commissions_source_valid"');
  });

  it("indexes active overlap checks and keeps restrictive foreign keys", () => {
    expect(migration).toMatch(/residence_reservations_residence_dates_idx[\s\S]*WHERE "status" <> 'annulee'/);
    expect(migration).toMatch(/residence_reservation_id_residence_reservations_id_fk[\s\S]*ON DELETE restrict/i);
  });

  it("persists owner cancellation provenance and reason", () => {
    const ownerManagementMigration = readFileSync(
      "drizzle/migrations/0032_residence_owner_reservation_management.sql",
      "utf8",
    );
    expect(ownerManagementMigration).toContain(
      'ADD COLUMN IF NOT EXISTS "cancellation_source" varchar(20)',
    );
    expect(ownerManagementMigration).toContain(
      'ADD COLUMN IF NOT EXISTS "cancellation_reason" varchar(500)',
    );
  });
});
