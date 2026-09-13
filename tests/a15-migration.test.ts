import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("A1.5 audit foreign key migration", () => {
  it("keeps the admin FK restricted after the multi-actor migration", () => {
    const migration = readFileSync(
      "drizzle/migrations/0015_restrict_audit_admin_deletion.sql",
      "utf8",
    );
    const causalityMigration = readFileSync(
      "drizzle/migrations/0035_causality_outbox.sql",
      "utf8",
    );
    const schema = readFileSync("src/infrastructure/db/schema.ts", "utf8");

    expect(migration).toContain('DROP CONSTRAINT "audit_log_admin_id_users_id_fk"');
    expect(migration).toMatch(/ON DELETE restrict/i);
    expect(causalityMigration).toContain(
      'ALTER TABLE "audit_log" ALTER COLUMN "admin_id" DROP NOT NULL',
    );
    expect(schema).toMatch(
      /adminId:[\s\S]{0,180}onDelete: "restrict"/,
    );
    expect(schema).toMatch(/actorType:[\s\S]{0,100}\.notNull\(\)/);
    expect(schema).toMatch(/actorId:[\s\S]{0,100}\.notNull\(\)/);
  });
});
