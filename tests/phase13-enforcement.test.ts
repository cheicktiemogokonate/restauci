import { existsSync, readFileSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const dependencyCruiserConfig = require("../.dependency-cruiser.cjs") as {
  forbidden: Array<{
    name: string;
    severity: string;
    to?: { pathNot?: string | string[] };
  }>;
};
const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
  scripts: Record<string, string>;
};
const moduleNames = readdirSync("src/modules", { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

describe("Phase 13 — enforcement bloquant et documentation canonique", () => {
  it("rend toutes les règles Dependency Cruiser bloquantes et couvre chaque module", () => {
    expect(dependencyCruiserConfig.forbidden.length).toBeGreaterThan(0);
    expect(
      dependencyCruiserConfig.forbidden.every(
        ({ severity }) => severity === "error",
      ),
    ).toBe(true);

    const declaredModules = dependencyCruiserConfig.forbidden
      .map(({ name }) => name.match(/^declared-(.+)-module-dependencies$/)?.[1])
      .filter((name): name is string => Boolean(name))
      .sort();

    expect(declaredModules).toEqual(moduleNames);
  });

  it("supprime les derniers mécanismes de baseline", () => {
    expect(existsSync(".dependency-cruiser-known-violations.json")).toBe(false);
    expect(existsSync("tests/architecture/baselines")).toBe(false);
    expect(existsSync("scripts/generate-app-db-baseline.ts")).toBe(false);
    expect(packageJson.scripts["architecture:cruise"]).not.toContain(
      "--ignore-known",
    );
  });

  it("bloque la CI sur les cinq contrôles de qualité attendus", () => {
    expect(packageJson.scripts["ci:quality"]).toBe(
      "npm run typecheck && npm run lint && npm run architecture:check && npm run test:phase13",
    );
    const workflow = readFileSync(".github/workflows/security-ci.yml", "utf8");
    expect(workflow).toContain("npm run ci:quality");
    expect(workflow).toContain("npm test");
  });

  it("garde le pre-commit et le lint stricts", () => {
    expect(packageJson.scripts.lint).toContain("--max-warnings=0");
    expect(readFileSync("lint-staged.config.mjs", "utf8")).toContain(
      "eslint --max-warnings=0",
    );
    expect(readFileSync(".husky/pre-commit", "utf8")).toContain(
      "npm run architecture:check",
    );
  });

  it("documente les extensions canoniques du monolithe", () => {
    const architecture = readFileSync("ARCHITECTURE.md", "utf8");
    for (const heading of [
      "### Ajouter une commande métier",
      "### Ajouter un événement causal",
      "### Ajouter une table",
      "### Ajouter une projection",
    ]) {
      expect(architecture, heading).toContain(heading);
    }

    for (const moduleName of moduleNames) {
      const rule = dependencyCruiserConfig.forbidden.find(
        ({ name }) => name === `declared-${moduleName}-module-dependencies`,
      );
      const pathNot = rule?.to?.pathNot;
      expect(typeof pathNot, moduleName).toBe("string");
      const declaredTargets = (pathNot as string)
        .match(/\(\?:([^)]*)\)/)?.[1]
        .split("|")
        .filter((target) => target !== moduleName) ?? [];
      const escapedModuleName = moduleName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const documentedRow = architecture.match(
        new RegExp(
          "^\\| `" + escapedModuleName + "` \\| ([^\\n]+) \\|$",
          "m",
        ),
      );
      expect(documentedRow, moduleName).not.toBeNull();
      const documentedTargets = [
        ...(documentedRow?.[1] ?? "").matchAll(/`([^`]+)`/g),
      ].map((match) => match[1]);

      expect(documentedTargets, moduleName).toEqual(declaredTargets);
    }
  });
});
