import { describe, expect, it } from "vitest";
import { cacheKey } from "./keys";

describe("restaurant public cache keys", () => {
  it("keeps id, slug, menu and listing projections explicit", () => {
    expect([
      cacheKey.restaurant("restaurant-id"),
      cacheKey.restaurantPublic("restaurant-slug"),
      cacheKey.restaurantPublicMenu("restaurant-slug"),
      cacheKey.restaurantsPublicAll(),
      cacheKey.restaurantsPublicMarket("market-id"),
    ]).toEqual([
      "restauci:restaurant:restaurant-id",
      "restauci:restaurant:public:restaurant-slug",
      "restauci:public:menu:restaurant-slug",
      "restauci:restaurants:public:all",
      "toutci:restaurants:public:market:market-id",
    ]);
  });
});
