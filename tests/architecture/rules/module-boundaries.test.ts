import * as path from "node:path";
import { describe, expect, it } from "vitest";
import { scanDirectory } from "../engine";
import {
  createSyntheticFile,
  findAppInternalViolations,
  findForeignInternalViolations,
  findInfrastructureToModulesViolations,
  findModulesToAppViolations,
  findRootBarrelViolations,
  findSharedToModulesViolations,
} from "../rules";

const allFiles = scanDirectory(path.join(process.cwd(), "src"));

describe("Architecture: module boundaries", () => {
  it("forbids modules -> app", () => {
    expect(findModulesToAppViolations(allFiles)).toEqual([]);
  });

  it("forbids imports of another module's internals", () => {
    expect(findForeignInternalViolations(allFiles)).toEqual([]);

    const fixture = createSyntheticFile(
      "src/modules/orders/server.ts",
      [
        {
          target: "@/modules/commissions/_internal/ledger",
          resolvedFilePath:
            "src/modules/commissions/_internal/ledger.ts",
        },
      ],
    );
    expect(findForeignInternalViolations([fixture])).toHaveLength(1);
  });

  it("allows a module to import its own internals", () => {
    const fixture = createSyntheticFile(
      "src/modules/orders/server.ts",
      [
        {
          target: "./_internal/create-order",
          resolvedFilePath: "src/modules/orders/_internal/create-order.ts",
        },
      ],
    );
    expect(findForeignInternalViolations([fixture])).toEqual([]);
  });

  it("forbids app -> module internals", () => {
    expect(findAppInternalViolations(allFiles)).toEqual([]);
  });

  it("forbids shared -> modules", () => {
    expect(findSharedToModulesViolations(allFiles)).toEqual([]);
  });

  it("forbids infrastructure -> modules except schema -> pure model", () => {
    expect(findInfrastructureToModulesViolations(allFiles)).toEqual([]);

    const allowed = createSyntheticFile(
      "src/infrastructure/db/schema.ts",
      [
        {
          target: "@/modules/orders/model",
          resolvedFilePath: "src/modules/orders/model.ts",
        },
      ],
    );
    const forbidden = createSyntheticFile(
      "src/infrastructure/cache/index.ts",
      [
        {
          target: "@/modules/orders/model",
          resolvedFilePath: "src/modules/orders/model.ts",
        },
      ],
    );
    expect(findInfrastructureToModulesViolations([allowed])).toEqual([]);
    expect(findInfrastructureToModulesViolations([forbidden])).toHaveLength(1);
  });

  it("forbids module root barrels", () => {
    expect(findRootBarrelViolations(allFiles)).toEqual([]);
  });
});
