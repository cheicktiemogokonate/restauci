import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { publicResidenceSearchSchema } from "@/modules/residences/contracts";

describe("recherche publique Résidences", () => {
  const persistence = readFileSync(
    "src/modules/residences/_internal/search.ts",
    "utf8",
  );
  const service = readFileSync("src/modules/residences/server.ts", "utf8");
  const page = readFileSync("src/app/(public)/residences/page.tsx", "utf8");
  const card = readFileSync(
    "src/components/residences/public-residence-card.tsx",
    "utf8",
  );

  it("valide ensemble destination, séjour, voyageurs et pagination", () => {
    expect(
      publicResidenceSearchSchema.parse({
        destination: "Grand-Bassam",
        checkIn: "2026-09-10",
        checkOut: "2026-09-13",
        guests: 4,
      }),
    ).toMatchObject({ page: 1, limit: 12, guests: 4 });
    expect(() =>
      publicResidenceSearchSchema.parse({ checkIn: "2026-09-10" }),
    ).toThrow("date d’arrivée et une date de départ");
    expect(() =>
      publicResidenceSearchSchema.parse({
        checkIn: "2026-09-13",
        checkOut: "2026-09-10",
      }),
    ).toThrow("doit suivre");
  });

  it("filtre l’éligibilité avant tout classement commercial", () => {
    expect(persistence).toContain("residence.publication_enabled_at IS NOT NULL");
    expect(persistence).toContain("residence.actif = TRUE");
    expect(persistence).toContain("residence.suspendu = FALSE");
    expect(persistence).toContain("identity.status = 'verified'");
    expect(persistence).toContain(") = 1");
    expect(persistence).toContain("capability.status = 'active'");
    expect(service).toContain("rankDiscoveryPage");
  });

  it("respecte le quota snapshoté d’une période payante", () => {
    expect(persistence).toContain("subscription_period_limits");
    expect(persistence).toContain("subscription_plan_limits");
    expect(persistence).toContain("ROW_NUMBER() OVER");
    expect(persistence).toContain("residence.quota_rank <= residence.quota_limit");
  });

  it("exclut les séjours en conflit avant la pagination", () => {
    expect(persistence).toContain("reservation.check_in <");
    expect(persistence).toContain("reservation.check_out >");
    expect(persistence).toContain("residence_unavailable_periods");
  });

  it("recherche une destination sans exiger la position du voyageur", () => {
    expect(page).toContain("Votre position");
    expect(page).toContain("actuelle n’est pas utilisée");
    expect(persistence).not.toContain("currentLocation");
    expect(persistence).toContain("residence.city ILIKE");
  });

  it("signale clairement les résultats mis en avant", () => {
    expect(card).toContain("Mis en avant");
    expect(card).toContain('residence.placement === "promoted"');
  });
});

describe("migration de recherche Résidences", () => {
  const migration = readFileSync(
    "drizzle/migrations/0025_residence_public_discovery.sql",
    "utf8",
  );

  it("indexe uniquement les fiches susceptibles d’être publiques", () => {
    expect(migration).toContain("residences_public_discovery_idx");
    expect(migration).toContain('"publication_enabled_at" IS NOT NULL');
    expect(migration).toContain('"actif" = TRUE');
    expect(migration).toContain('"suspendu" = FALSE');
    expect(migration).toContain('"archived_at" IS NULL');
  });
});
