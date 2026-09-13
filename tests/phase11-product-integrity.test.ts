import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { assertTestDataEnvironment } from "../scripts/test-data/data-environment";
import { HIDDEN_PRODUCT_NOTIFICATION_TYPES } from "@/modules/notifications/model";

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

const removedDemoFiles = [
  "src/components/onboarding/StepSocials.tsx",
  "src/components/onboarding/DashboardView.tsx",
  "src/components/landing/components/Benefits.tsx",
  "src/components/landing/components/DashboardShowcase.tsx",
  "src/components/landing/components/FeatureGrid.tsx",
  "src/components/landing/components/InteractiveDashboard.tsx",
  "src/components/landing/components/Testimonials.tsx",
  "src/components/landing/components/TrustedBy.tsx",
  "src/modules/restaurants/presentation/public-page/gallery-section.tsx",
  "src/modules/restaurants/presentation/public-page/reviews-section.tsx",
  "src/modules/restaurants/presentation/public-page/reserve-modal.tsx",
] as const;

const featurePresentationFiles = [
  "src/app/(client)/client/login/page.tsx",
  "src/app/(client)/client/restaurant/[slug]/page.tsx",
  "src/components/client-app/restaurant-bottom-sheet.tsx",
  "src/modules/menu/presentation/menu-card.tsx",
  "src/modules/menu/presentation/menu-detail-client.tsx",
  "src/modules/menu/presentation/plat-stats-panel.tsx",
  "src/modules/menu/presentation/similar-dishes.tsx",
  "src/modules/orders/presentation/client-info.tsx",
  "src/modules/restaurants/presentation/admin-restaurant-detail.tsx",
  "src/modules/restaurants/presentation/admin-restaurants-table.tsx",
  "src/modules/restaurants/presentation/public-page/hero.tsx",
] as const;

describe("Phase 11 — intégrité des surfaces produit", () => {
  it("retire les composants de simulation et les faux parcours", () => {
    for (const file of removedDemoFiles) {
      expect(existsSync(file), file).toBe(false);
    }
  });

  it("interdit les imports de démonstration dans les routes produit", () => {
    const importPattern = /(?:from\s+|import\s*\()\s*["']([^"']+)["']/g;

    for (const file of sourceFiles("src/app")) {
      const source = readFileSync(file, "utf8");
      const imports = [...source.matchAll(importPattern)].map((match) => match[1]);
      expect(imports, file).not.toContain(undefined);
      for (const target of imports) {
        expect(target, `${file} -> ${target}`).not.toMatch(
          /(?:^|\/)(?:demo|demos|fixture|fixtures|mock|mocks)(?:[./-]|$)/i,
        );
      }
    }
  });

  it("masque avis, favoris et messagerie dans les présentations concernées", () => {
    for (const file of featurePresentationFiles) {
      const source = readFileSync(file, "utf8");
      expect(source, file).not.toMatch(
        /\b(?:noteMoyenne|nombreAvis|nouveau_avis|favoris?|messagerie)\b/i,
      );
    }
    expect(HIDDEN_PRODUCT_NOTIFICATION_TYPES).toEqual([
      "nouveau_avis",
      "promotion",
    ]);
  });

  it("ne présente plus les visuels et compteurs de secours comme réels", () => {
    const publicRoute = readFileSync(
      "src/app/(public)/restaurant/[slug]/page.tsx",
      "utf8",
    );
    const clientRoute = readFileSync(
      "src/app/(client)/client/restaurant/[slug]/page.tsx",
      "utf8",
    );
    const publicHero = readFileSync(
      "src/modules/restaurants/presentation/public-page/hero.tsx",
      "utf8",
    );
    const landing = readFileSync(
      "src/components/landing/components/AboutPlatform.tsx",
      "utf8",
    );
    const dashboardPage = readFileSync(
      "src/app/(dashboard)/(partenaire)/restaurateur/page.tsx",
      "utf8",
    );

    for (const source of [publicRoute, clientRoute, publicHero]) {
      expect(source).not.toMatch(
        /assets\/images\/(?:dish_poulet_kedjenou|hero_bg|restaurant_exterior_night)/,
      );
    }
    expect(landing).not.toMatch(/142_500|Table 8|Sync OK|Filet de Saumon/);
    expect(dashboardPage).toContain("<StatsCardsSkeleton />");
    expect(dashboardPage).not.toContain("fallback={<StatsShell");
  });

  it("refuse toute création de fixtures sans origine d'environnement explicite", () => {
    const base = {
      argv: ["node", "seed.ts", "--confirmed-development-test"],
      env: {
        NODE_ENV: "development",
        TOUTCI_DATA_ENVIRONMENT: "development",
        DATABASE_URL: "postgresql://user:secret@db.example.test/toutci_dev",
      },
    } as const;

    expect(assertTestDataEnvironment(base)).toMatchObject({
      environment: "development",
      databaseHost: "db.example.test",
      databaseName: "toutci_dev",
    });
    expect(() =>
      assertTestDataEnvironment({
        ...base,
        argv: ["node", "seed.ts"],
      }),
    ).toThrow(/confirmed-development-test/);
    expect(() =>
      assertTestDataEnvironment({
        ...base,
        env: { ...base.env, TOUTCI_DATA_ENVIRONMENT: undefined },
      }),
    ).toThrow(/TOUTCI_DATA_ENVIRONMENT/);
    expect(() =>
      assertTestDataEnvironment({
        ...base,
        env: {
          ...base.env,
          NODE_ENV: "production",
          TOUTCI_DATA_ENVIRONMENT: "development",
        },
      }),
    ).toThrow(/production/);
  });
});
