import { describe, expect, it } from "vitest";
import {
  assertRestaurantOrderActorCanTransition,
  canRestaurantSetOrderStatus,
} from "./model";

describe("restaurant order actors", () => {
  it("keeps client, restaurant, delivery and system rights distinct", () => {
    expect(() =>
      assertRestaurantOrderActorCanTransition("client", "annulee"),
    ).not.toThrow();
    expect(() =>
      assertRestaurantOrderActorCanTransition("client", "prete"),
    ).toThrowError(expect.objectContaining({ code: "UNAUTHORIZED_TRANSITION" }));
    expect(() =>
      assertRestaurantOrderActorCanTransition("restaurant", "recue"),
    ).toThrowError(expect.objectContaining({ code: "UNAUTHORIZED_TRANSITION" }));
    expect(() =>
      assertRestaurantOrderActorCanTransition("delivery", "servie"),
    ).not.toThrow();
    expect(() =>
      assertRestaurantOrderActorCanTransition("system", "recue"),
    ).not.toThrow();
  });

  it("reserves delivery completion to the delivery workflow", () => {
    expect(canRestaurantSetOrderStatus("livraison", "servie")).toBe(false);
    expect(canRestaurantSetOrderStatus("sur_place", "servie")).toBe(true);
  });
});
