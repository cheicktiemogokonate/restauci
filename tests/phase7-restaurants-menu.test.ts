import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

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

describe("Phase 7 — Restaurants et Menu", () => {
  it("groups every partner dashboard below one semantic route group", () => {
    expect(existsSync("src/app/(dashboard)/(partenaire)/partenaire")).toBe(true);
    expect(existsSync("src/app/(dashboard)/(partenaire)/restaurateur")).toBe(true);
    expect(existsSync("src/app/(dashboard)/partenaire")).toBe(false);
    expect(existsSync("src/app/(dashboard)/restaurateur")).toBe(false);
  });

  it("enforces Restaurant ownership for categories and schedules in SQL", () => {
    const migration = readFileSync(
      "drizzle/migrations/0040_restaurant_menu_ownership.sql",
      "utf8",
    );
    expect(migration).toContain('"plats_restaurant_category_fk"');
    expect(migration).toContain('"plats_restaurant_schedule_fk"');
    expect(migration).toContain('"categories_restaurant_schedule_fk"');
    expect(migration).toContain('"categories_restaurant_name_unique"');
  });

  it("keeps Restaurant and Menu presentation free from server and DB imports", () => {
    const files = [
      ...sourceFiles("src/modules/restaurants/presentation"),
      ...sourceFiles("src/modules/menu/presentation"),
    ];
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      const source = readFileSync(file, "utf8");
      expect(source, file).not.toMatch(/@\/modules\/(restaurants|menu)\/server/);
      expect(source, file).not.toMatch(/@\/(lib|infrastructure)\/db/);
      expect(source, file).not.toMatch(/@\/app\//);
    }
  });

  it("keeps the migrated Next adapters free from direct DB access", () => {
    const roots = [
      "src/app/(dashboard)/(partenaire)/restaurateur/menu",
      "src/app/(dashboard)/(partenaire)/restaurateur/profil",
      "src/app/(public)/restaurant",
      "src/app/api/restaurateur/categories",
      "src/app/api/restaurateur/plats",
      "src/app/api/v1/public/restaurants",
      "src/app/api/v1/restaurateur/plats",
    ];
    for (const file of roots.flatMap(sourceFiles)) {
      const source = readFileSync(file, "utf8");
      expect(source, file).not.toMatch(/@\/(lib|infrastructure)\/db/);
      expect(source, file).not.toMatch(/drizzle-orm/);
    }
  });

  it("uses the verified beUI controls in migrated interactive screens", () => {
    const sources = [
      "src/modules/menu/presentation/menu-filters.tsx",
      "src/modules/menu/presentation/plat-edit-dialog.tsx",
      "src/modules/restaurants/presentation/formulaire-profil.tsx",
      "src/modules/restaurants/presentation/opening-hours-manager.tsx",
      "src/modules/restaurants/presentation/admin-restaurants-table.tsx",
    ].map((file) => readFileSync(file, "utf8")).join("\n");
    expect(sources).toContain("@/components/motion/input");
    expect(sources).toContain("@/components/motion/select");
    expect(sources).toContain("@/components/motion/switch");
    expect(sources).toContain("@/components/motion/tabs");
  });

  it("removes legacy Restaurant/Menu rule entry points and fake write vocabulary", () => {
    for (const file of [
      "src/lib/restaurants/policy.ts",
      "src/lib/restaurants/public-dto.ts",
      "src/lib/menu/default-categories.ts",
      "src/lib/quota-entitlements.ts",
      "src/lib/quota-selection.ts",
      "src/lib/utils/creneaux.ts",
      "src/lib/validations/plat.ts",
      "src/lib/validations/restaurant.ts",
    ]) {
      expect(existsSync(file), file).toBe(false);
    }
    const writeSources = [
      "src/app/onboarding/actions.ts",
      "src/modules/menu/_internal/persistence.ts",
      "src/modules/restaurants/_internal/create.ts",
    ].map((file) => readFileSync(file, "utf8")).join("\n");
    expect(writeSources).not.toMatch(/d[ée]monstration/i);
  });
});
