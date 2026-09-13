import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { getUserNotificationDestination } from "@/modules/notifications/model";

function sourceFiles(root: string): string[] {
  if (!existsSync(root)) return [];
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const path = join(root, entry.name);
    return entry.isDirectory()
      ? sourceFiles(path)
      : /\.(ts|tsx)$/.test(entry.name)
        ? [path]
        : [];
  });
}

describe("Phase 8 — Résidences", () => {
  it("enforces reservation ownership and active-stay exclusivity in SQL", () => {
    const migration = readFileSync(
      "drizzle/migrations/0041_residence_vertical_invariants.sql",
      "utf8",
    );
    expect(migration).toContain('"residence_reservations_residence_partner_fk"');
    expect(migration).toContain('"residence_reservations_no_active_overlap"');
    expect(migration).toContain("EXCLUDE USING gist");
    expect(migration).toContain("daterange(\"check_in\", \"check_out\", '[)')");
  });

  it("records paid cancellations as idempotent refund obligations", () => {
    const residences = readFileSync("src/modules/residences/server.ts", "utf8");
    expect(residences).toContain("createRefundObligationInTransaction");
    expect(residences).toContain(
      "refundIdempotencyKey: `residence-cancellation:${reservation.id}`",
    );
    expect(residences.match(/createRefundObligationInTransaction/g)?.length).toBe(3);
    expect(residences).not.toContain("requiresManualRefund");
  });

  it("keeps Residence presentation free from adapters, servers, and DB imports", () => {
    const files = sourceFiles("src/modules/residences/presentation");
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      const source = readFileSync(file, "utf8");
      expect(source, file).not.toMatch(/@\/modules\/residences\/server/);
      expect(source, file).not.toMatch(/@\/(lib|infrastructure)\/db/);
      expect(source, file).not.toMatch(/@\/app\//);
    }
  });

  it("keeps migrated Residence adapters free from direct DB access", () => {
    const roots = [
      "src/app/(dashboard)/(partenaire)/partenaire/residences",
      "src/app/(dashboard)/(partenaire)/partenaire/reservations",
      "src/app/(dashboard)/admin/residences",
      "src/app/(public)/residences",
      "src/app/api/v1/client/residences",
      "src/app/api/v1/client/reservations",
    ];
    for (const file of roots.flatMap(sourceFiles)) {
      const source = readFileSync(file, "utf8");
      expect(source, file).not.toMatch(/@\/(lib|infrastructure)\/db/);
      expect(source, file).not.toMatch(/drizzle-orm/);
    }
  });

  it("reuses the resolved beUI controls on Residence management screens", () => {
    const sources = [
      "src/modules/residences/presentation/admin-residences-table.tsx",
      "src/modules/residences/presentation/partner-reservations-workspace.tsx",
      "src/modules/residences/presentation/residence-calendar-manager.tsx",
      "src/modules/residences/presentation/residence-form.tsx",
      "src/modules/residences/presentation/residence-onboarding-wizard.tsx",
    ]
      .map((file) => readFileSync(file, "utf8"))
      .join("\n");
    expect(sources).toContain("@/components/motion/input");
    expect(sources).toContain("@/components/motion/select");
    expect(sources).toContain("@/components/motion/checkbox");
    expect(sources).toContain("@/components/motion/tabs");
    expect(sources).toContain("@/components/motion/table");
  });

  it("routes Residence notifications to navigable partner destinations", () => {
    expect(
      getUserNotificationDestination("residence", {
        lienType: "reservation_residence",
        lienId: "booking/with spaces",
      }),
    ).toEqual({
      href: "/partenaire/reservations?reservation=booking%2Fwith%20spaces",
      label: "Voir la réservation",
    });
    expect(
      getUserNotificationDestination("residence", {
        lienType: "residence",
        lienId: "residence-id",
      }),
    ).toEqual({
      href: "/partenaire/residences/residence-id",
      label: "Voir la résidence",
    });
  });
});
