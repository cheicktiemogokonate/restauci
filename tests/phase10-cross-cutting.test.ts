import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { persistedNotificationSchema } from "@/modules/notifications/contracts";
import { getUserNotificationDestination } from "@/modules/notifications/model";
import { rankDiscoveryPage } from "@/modules/discovery/model";

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

describe("Phase 10 — Notifications, Audit, Discovery et administration", () => {
  it("borne les destinataires et centralise leur résolution", () => {
    const owner = { userId: crypto.randomUUID() };
    expect(
      persistedNotificationSchema.safeParse({
        ...owner,
        type: "systeme",
        titre: "Information",
        message: "Message",
        destination: { type: "residence", id: crypto.randomUUID() },
      }).success,
    ).toBe(true);
    expect(
      persistedNotificationSchema.safeParse({
        ...owner,
        type: "systeme",
        titre: "Information",
        message: "Message",
        destination: { type: "inconnue", id: "1" },
      }).success,
    ).toBe(false);
    expect(
      getUserNotificationDestination("residence", {
        lienType: "reservation_residence",
        lienId: "reservation-1",
      }),
    ).toEqual({
      href: "/partenaire/reservations?reservation=reservation-1",
      label: "Voir la réservation",
    });
  });

  it("classe uniquement les candidats déjà déclarés éligibles", () => {
    const candidates = [
      {
        resourceId: "restaurant-a",
        partnerAccountId: crypto.randomUUID(),
        planCode: "decouverte" as const,
        organicRank: 0,
      },
      {
        resourceId: "restaurant-b",
        partnerAccountId: crypto.randomUUID(),
        planCode: "croissance" as const,
        organicRank: 1,
      },
    ];
    const first = rankDiscoveryPage({
      candidates,
      policy: {
        enabled: true,
        sponsoredShareBps: 5_000,
        maxPromotedPerPartner: 1,
        rotationWindowMinutes: 60,
      },
      benefitsByPlan: {
        decouverte: {
          exposureWeight: 1,
          searchPromotedEligible: false,
          partnerBadgeEnabled: false,
        },
        croissance: {
          exposureWeight: 2,
          searchPromotedEligible: true,
          partnerBadgeEnabled: false,
        },
        partenaire_fier: {
          exposureWeight: 3,
          searchPromotedEligible: true,
          partnerBadgeEnabled: true,
        },
      },
      context: {
        contextKey: "phase10",
        page: 1,
        pageSize: 2,
        at: new Date("2026-09-09T10:00:00Z"),
      },
    });
    expect(first.items.map(({ resourceId, placement }) => ({ resourceId, placement }))).toEqual([
      { resourceId: "restaurant-b", placement: "promoted" },
      { resourceId: "restaurant-a", placement: "organic" },
    ]);
    expect(first.total).toBe(candidates.length);
  });

  it("inverse la dépendance : Discovery consomme l’éligibilité des domaines", () => {
    const discovery = readFileSync("src/modules/discovery/server.ts", "utf8");
    const restaurants = readFileSync("src/modules/restaurants/server.ts", "utf8");
    const residences = readFileSync("src/modules/residences/server.ts", "utf8");
    expect(discovery).toContain("getRestaurantDiscoveryEligibility");
    expect(discovery).toContain("getResidenceDiscoveryEligibility");
    expect(restaurants).not.toContain('from "@/modules/discovery');
    expect(residences).not.toContain('from "@/modules/discovery');
  });

  it("rend les projections réparables et supprime les destinations orphelines", () => {
    const migration = readFileSync(
      "drizzle/migrations/0043_notifications_audit_discovery_admin.sql",
      "utf8",
    );
    expect(migration).toContain("prune_orphan_notifications");
    expect(migration).toContain("rebuild_causal_projections");
    expect(migration).toContain("effect_payload jsonb");
    expect(migration).toContain("residences_archive_notification_projections");
    expect(migration).toContain("supprime les 235 orphelines");
  });

  it("fait passer les pages admin par des contrats publics sans accès DB direct", () => {
    for (const file of sourceFiles("src/app/(dashboard)/admin")) {
      const source = readFileSync(file, "utf8");
      expect(source, file).not.toMatch(/@\/(lib|infrastructure)\/db/);
      expect(source, file).not.toMatch(/drizzle-orm/);
    }
    expect(
      readFileSync("src/app/(dashboard)/admin/page.tsx", "utf8"),
    ).toContain("@/modules/admin-projections/server");
  });

  it("réutilise le shell shadcn, la table beUI et les onglets beUI résolus", () => {
    expect(readFileSync("src/components/admin/admin-sidebar.tsx", "utf8")).toContain(
      "@/components/ui/sidebar",
    );
    expect(readFileSync("src/components/admin/audit-admin-table.tsx", "utf8")).toContain(
      "@/components/motion/table",
    );
    expect(
      readFileSync(
        "src/modules/notifications/presentation/notification-center.tsx",
        "utf8",
      ),
    ).toContain("@/components/motion/tabs");
  });
});
