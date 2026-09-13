import * as path from "node:path";
import { describe, expect, it } from "vitest";
import { scanDirectory } from "../engine";
import {
  createSyntheticFile,
  findAppDbViolations,
  type ArchitectureViolation,
} from "../rules";

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

describe("Architecture: app -> DB", () => {
  it("forbids every app import of DB infrastructure", () => {
    expect(currentViolations.map(formatViolation)).toEqual([]);
  });

  it("rejects a new file importing DB infrastructure", () => {
    const newFile = createSyntheticFile(
      "src/app/example/page.tsx",
      [
        {
          target: "@/infrastructure/db",
          resolvedFilePath: "src/infrastructure/db/index.ts",
        },
      ],
    );
    expect(findAppDbViolations([newFile])).toEqual([
      { file: "src/app/example/page.tsx", target: "@/infrastructure/db" },
    ]);
  });
});
