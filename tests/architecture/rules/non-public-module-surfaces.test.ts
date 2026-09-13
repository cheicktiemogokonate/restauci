import * as path from "node:path";
import { describe, expect, it } from "vitest";
import { scanDirectory } from "../engine";
import {
  createSyntheticFile,
  findNonPublicModuleSurfaceViolations,
} from "../rules";

const currentViolations = findNonPublicModuleSurfaceViolations(
  ["src", "tests", "scripts"].flatMap((directory) =>
    scanDirectory(path.join(process.cwd(), directory)),
  ),
);

describe("Architecture: public module surfaces", () => {
  it("forbids every import outside a public module surface", () => {
    expect(currentViolations).toEqual([]);
  });

  it("rejects the same private target from a new source file", () => {
    const fixture = createSyntheticFile("src/app/example/page.tsx", [
      {
        target: "@/modules/transactions/_internal/provider-accounts",
        resolvedFilePath:
          "src/modules/transactions/_internal/provider-accounts.ts",
      },
    ]);

    expect(
      findNonPublicModuleSurfaceViolations([fixture]),
    ).toEqual([
      {
        file: "src/app/example/page.tsx",
        target: "@/modules/transactions/_internal/provider-accounts",
      },
    ]);
  });

  it("allows an explicit public surface", () => {
    const fixture = createSyntheticFile("src/app/example/page.tsx", [
      {
        target: "@/modules/transactions/server",
        resolvedFilePath: "src/modules/transactions/server.ts",
      },
    ]);

    expect(findNonPublicModuleSurfaceViolations([fixture])).toEqual([]);
  });
});
