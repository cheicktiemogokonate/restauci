import * as path from "node:path";
import { describe, expect, it } from "vitest";
import { parseSourceImports } from "./engine";

describe("architecture import engine", () => {
  it("parses imports, exports, dynamic imports, import types and require", () => {
    const metadata = parseSourceImports(
      path.join(process.cwd(), "src/app/example.ts"),
      [
        'import { db } from "@/infrastructure/db";',
        'export { value } from "../lib/value";',
        'const lazy = import("@/modules/orders/server");',
        'type Database = typeof import("@/infrastructure/db").db;',
        'const legacy = require("@/infrastructure/db/schema");',
        "void lazy; void legacy;",
      ].join("\n"),
    );

    expect(metadata.imports.map(({ kind, target }) => [kind, target])).toEqual([
      ["export", "../lib/value"],
      ["import", "@/infrastructure/db"],
      ["import-type", "@/infrastructure/db"],
      ["require", "@/infrastructure/db/schema"],
      ["dynamic-import", "@/modules/orders/server"],
    ]);
    expect(
      metadata.imports.find(({ target }) => target === "@/infrastructure/db")
        ?.resolvedFilePath,
    ).toContain("/src/infrastructure/db/index.ts");
    expect(
      metadata.imports.find(({ target }) => target === "../lib/value")
        ?.resolvedFilePath,
    ).toContain("/src/lib/value");
  });

  it("recognizes use client only when it is a directive", () => {
    expect(
      parseSourceImports("src/client.tsx", '"use client";\nexport {};')
        .isClientComponent,
    ).toBe(true);
    expect(
      parseSourceImports("src/server.ts", 'const text = "use client";')
        .isClientComponent,
    ).toBe(false);
  });
});
