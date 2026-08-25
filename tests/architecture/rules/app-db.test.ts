import * as fs from "node:fs";
import * as path from "node:path";
import { describe, expect, it } from "vitest";
import { scanDirectory } from "../engine";
import {
  createSyntheticFile,
  findAppDbViolations,
  findNewViolations,
  type ArchitectureViolation,
} from "../rules";

const baselinePath = path.join(
  process.cwd(),
  "tests/architecture/baselines/app-db-imports.json",
);
const baseline = JSON.parse(
  fs.readFileSync(baselinePath, "utf8"),
) as ArchitectureViolation[];
const currentViolations = findAppDbViolations(
  scanDirectory(path.join(process.cwd(), "src/app")),
);

function formatViolation({ file, target }: ArchitectureViolation) {
  return [
    "New architecture violation:",
    "",
    file,
    "imports",
    target,
    "",
    "app must use a module public API instead.",
  ].join("\n");
}

describe("Architecture: app -> DB ratchet", () => {
  it("accepts the exact A3.0 legacy baseline", () => {
    const newViolations = findNewViolations(currentViolations, baseline);
    expect(newViolations.map(formatViolation)).toEqual([]);
  });

  it("rejects a new file importing the legacy DB", () => {
    const newFile = createSyntheticFile(
      "src/app/example/page.tsx",
      [{ target: "@/lib/db", resolvedFilePath: "src/lib/db/index.ts" }],
    );
    const actual = [...currentViolations, ...findAppDbViolations([newFile])];

    expect(findNewViolations(actual, baseline)).toEqual([
      { file: "src/app/example/page.tsx", target: "@/lib/db" },
    ]);
  });

  it("continues to pass when a known violation is removed", () => {
    const [removed, ...reducedViolations] = currentViolations;
    expect(removed).toBeDefined();
    expect(findNewViolations(reducedViolations, baseline)).toEqual([]);
  });
});
