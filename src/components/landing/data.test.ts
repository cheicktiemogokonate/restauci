import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dishesData } from "./data";

describe("montants de démonstration de la landing", () => {
  it("utilise uniquement des prix FCFA entiers", () => {
    expect(dishesData.every((dish) => Number.isInteger(dish.price))).toBe(true);
  });

  it("ne conserve plus de catalogue d’abonnement codé en dur", () => {
    const source = readFileSync("src/components/landing/data.ts", "utf8");
    expect(source).not.toContain("planPresentationByCode");
    expect(source).not.toContain("Placement prioritaire");
  });
});
