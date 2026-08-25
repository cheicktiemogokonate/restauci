import { describe, expect, it } from "vitest";
import {
  isRestaurantOrderable,
  isRestaurantPubliclyVisible,
} from "./policy";

describe("restaurant public visibility and orderability", () => {
  it("keeps a public restaurant visible while orders are paused", () => {
    const restaurant = {
      actif: true,
      suspendu: false,
      enLigne: true,
      accepteCommandes: false,
    };

    expect(isRestaurantPubliclyVisible(restaurant)).toBe(true);
    expect(isRestaurantOrderable(restaurant)).toBe(false);
  });

  it("keeps an offline restaurant visible while blocking orders", () => {
    const restaurant = {
      actif: true,
      suspendu: false,
      enLigne: false,
      accepteCommandes: true,
    };

    expect(isRestaurantPubliclyVisible(restaurant)).toBe(true);
    expect(isRestaurantOrderable(restaurant)).toBe(false);
  });

  it("hides and blocks a suspended restaurant", () => {
    const restaurant = {
      actif: true,
      suspendu: true,
      enLigne: true,
      accepteCommandes: true,
    };

    expect(isRestaurantPubliclyVisible(restaurant)).toBe(false);
    expect(isRestaurantOrderable(restaurant)).toBe(false);
  });
});
