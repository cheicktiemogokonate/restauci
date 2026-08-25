import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("A1.5 audit foreign key migration", () => {
  it("replaces SET NULL with RESTRICT while admin_id stays non-null", () => {
    const migration = readFileSync(
      "drizzle/migrations/0015_restrict_audit_admin_deletion.sql",
      "utf8",
    );
    const schema = readFileSync("src/lib/db/schema.ts", "utf8");

    expect(migration).toContain('DROP CONSTRAINT "audit_log_admin_id_users_id_fk"');
    expect(migration).toMatch(/ON DELETE restrict/i);
    expect(schema).toMatch(
      /adminId:[\s\S]{0,180}\.notNull\(\)[\s\S]{0,180}onDelete: "restrict"/,
    );
  });
});
