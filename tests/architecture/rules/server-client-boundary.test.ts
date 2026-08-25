import * as path from "node:path";
import { describe, expect, it } from "vitest";
import { scanDirectory } from "../engine";
import {
  createSyntheticFile,
  findClientServerViolations,
} from "../rules";

describe("Architecture: client -> server boundary", () => {
  it("keeps current source free of new module/infrastructure violations", () => {
    expect(
      findClientServerViolations(
        scanDirectory(path.join(process.cwd(), "src")),
      ),
    ).toEqual([]);
  });

  it("detects a Client Component importing a module server entrypoint", () => {
    const fixture = createSyntheticFile(
      "src/app/example/client.tsx",
      [
        {
          target: "@/modules/orders/server",
          resolvedFilePath: "src/modules/orders/server.ts",
        },
      ],
      { client: true },
    );
    expect(findClientServerViolations([fixture])).toHaveLength(1);
  });

  it("detects a Client Component importing infrastructure DB", () => {
    const fixture = createSyntheticFile(
      "src/app/example/client.tsx",
      [
        {
          target: "@/infrastructure/db",
          resolvedFilePath: "src/infrastructure/db/index.ts",
        },
      ],
      { client: true },
    );
    expect(findClientServerViolations([fixture])).toHaveLength(1);
  });
});
