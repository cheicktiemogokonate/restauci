import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const directStatusUpdate = /\.update\(commandes\)[\s\S]{0,500}?\.set\(\{[\s\S]{0,200}?statut\s*:/;

describe("A1.5 — chemin canonique des transitions de commande", () => {
  it.each([
    "src/app/api/v1/client/commandes/[id]/route.ts",
    "src/lib/actions/commandes.ts",
  ])("interdit une écriture directe du statut dans %s", (file) => {
    const source = readFileSync(file, "utf8");
    expect(source).not.toMatch(directStatusUpdate);
  });
});
