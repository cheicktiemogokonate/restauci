import { describe, expect, it } from "vitest";
import {
  canRestaurateurSetCommandeStatus,
  STATUT_PREVIOUS_STATUSES,
  STATUT_TRANSITIONS,
} from "../src/types/commandes";

describe("workflow des commandes", () => {
  it("garde les transitions UI et serveur cohérentes", () => {
    for (const [from, targets] of Object.entries(STATUT_TRANSITIONS)) {
      for (const target of targets) {
        expect(STATUT_PREVIOUS_STATUSES[target]).toContain(from);
      }
    }
  });

  it("refuse toute transition depuis un état terminal", () => {
    expect(STATUT_TRANSITIONS.servie).toEqual([]);
    expect(STATUT_TRANSITIONS.annulee).toEqual([]);
  });

  it("n'autorise pas le restaurateur à clôturer une livraison", () => {
    expect(canRestaurateurSetCommandeStatus("livraison", "servie")).toBe(false);
    expect(canRestaurateurSetCommandeStatus("livraison", "prete")).toBe(true);
    expect(canRestaurateurSetCommandeStatus("sur_place", "servie")).toBe(true);
    expect(canRestaurateurSetCommandeStatus("emporter", "servie")).toBe(true);
  });
});
