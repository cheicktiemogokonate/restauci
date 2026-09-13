import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { scanDirectory } from "./architecture/engine";
import { findAppDbViolations } from "./architecture/rules";

function sourceFiles(root: string): string[] {
  if (!existsSync(root)) return [];
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const path = join(root, entry.name);
    return entry.isDirectory()
      ? sourceFiles(path)
      : /\.(?:c|m)?[jt]sx?$/.test(entry.name)
        ? [path]
        : [];
  });
}

describe("Phase 12 — shared kernel et extinction du legacy", () => {
  it("supprime définitivement src/lib", () => {
    expect(existsSync("src/lib")).toBe(false);
  });

  it("ne conserve aucun import actif vers l'ancien alias lib", () => {
    const importPattern = /(?:from\s+|import\s*\()\s*["']([^"']+)["']/g;
    for (const file of sourceFiles("src")) {
      const imports = [
        ...readFileSync(file, "utf8").matchAll(importPattern),
      ].map((match) => match[1]);
      expect(imports.filter((target) => target.startsWith("@/lib")), file).toEqual([]);
    }
  });

  it("interdit toute dépendance app vers l'infrastructure DB", () => {
    const violations = findAppDbViolations(scanDirectory(join(process.cwd(), "src/app")));
    expect(violations).toEqual([]);
  });

  it("ferme les trois baselines d'architecture migratoires", () => {
    for (const baseline of [
      "tests/architecture/baselines/app-db-imports.json",
      "tests/architecture/baselines/non-public-module-imports.json",
      "tests/architecture/baselines/module-matrix-imports.json",
    ]) {
      expect(existsSync(baseline), baseline).toBe(false);
    }
    expect(existsSync(".dependency-cruiser-known-violations.json")).toBe(false);
  });

  it("pointe les outils DB et UI vers les nouvelles racines", () => {
    expect(readFileSync("drizzle.config.ts", "utf8")).toContain(
      'schema: "./src/infrastructure/db/schema.ts"',
    );
    const aliases = JSON.parse(readFileSync("components.json", "utf8"));
    expect(aliases.aliases.utils).toBe("@/shared/ui/cn");
    expect(aliases.aliases.lib).toBe("@/shared");
  });
});
