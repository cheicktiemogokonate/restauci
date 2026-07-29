import {
  DEFAULT_MENU_CATEGORIES,
  getInitialMenuCategories,
} from "../src/lib/menu/default-categories";
import { describe, expect, it } from "vitest";

describe("getInitialMenuCategories", () => {
  it("fournit les cinq catégories de démarrage de l'offre Découverte", () => {
    expect(getInitialMenuCategories(5)).toEqual([
      "Entrées",
      "Plats principaux",
      "Accompagnements",
      "Desserts",
      "Boissons",
    ]);
  });

  it("respecte une limite de catégories plus basse", () => {
    expect(getInitialMenuCategories(3)).toEqual(
      DEFAULT_MENU_CATEGORIES.slice(0, 3),
    );
  });

  it("ne crée que les cinq catégories de base pour une offre illimitée", () => {
    expect(getInitialMenuCategories(null)).toEqual(DEFAULT_MENU_CATEGORIES);
  });
});
