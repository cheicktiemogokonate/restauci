import { describe, expect, it } from "vitest";
import { selectRestaurantQuotaEligibleResources } from "./model";

const publishedAt = new Date("2026-01-01T00:00:00.000Z");
const createdAt = new Date("2025-01-01T00:00:00.000Z");
const category = (id: string, firstPublishedAt: Date | null = publishedAt) => ({
  id,
  createdAt,
  firstPublishedAt,
});
const dish = (id: string, categoryId: string, firstPublishedAt: Date | null = publishedAt) => ({
  id,
  categoryId,
  createdAt,
  firstPublishedAt,
});

describe("quota publication selection", () => {
  it("uses category slots before ranking dishes", () => {
    const result = selectRestaurantQuotaEligibleResources(
      [category("cat-a"), category("cat-b")],
      [dish("dish-a", "cat-b"), dish("dish-b", "cat-a")],
      { category: 1, dish: 10 },
    );
    expect([...result.categoryIds]).toEqual(["cat-a"]);
    expect([...result.dishIds]).toEqual(["dish-b"]);
  });

  it("does not release a slot when publication intent is turned off", () => {
    const resources = [
      { ...dish("dish-a", "cat-a"), publicationIntent: false },
      { ...dish("dish-b", "cat-a"), publicationIntent: true },
    ];
    const result = selectRestaurantQuotaEligibleResources([category("cat-a")], resources, {
      category: 1,
      dish: 1,
    });
    expect([...result.dishIds]).toEqual(["dish-a"]);
  });

  it("releases a slot only after deletion", () => {
    const before = selectRestaurantQuotaEligibleResources(
      [category("cat-a")],
      [dish("dish-a", "cat-a"), dish("dish-b", "cat-a")],
      { category: 1, dish: 1 },
    );
    const after = selectRestaurantQuotaEligibleResources(
      [category("cat-a")],
      [dish("dish-b", "cat-a")],
      { category: 1, dish: 1 },
    );
    expect([...before.dishIds]).toEqual(["dish-a"]);
    expect([...after.dishIds]).toEqual(["dish-b"]);
  });

  it("reacts deterministically to quota increases and decreases", () => {
    const dishes = [dish("a", "cat-a"), dish("b", "cat-a"), dish("c", "cat-a")];
    const large = selectRestaurantQuotaEligibleResources([category("cat-a")], dishes, { category: 1, dish: 3 });
    const small = selectRestaurantQuotaEligibleResources([category("cat-a")], dishes, { category: 1, dish: 1 });
    expect([...large.dishIds]).toEqual(["a", "b", "c"]);
    expect([...small.dishIds]).toEqual(["a"]);
  });

  it("uses the id as a stable final tie-breaker", () => {
    const result = selectRestaurantQuotaEligibleResources(
      [category("cat-a")],
      [dish("z", "cat-a"), dish("a", "cat-a")],
      { category: 1, dish: 1 },
    );
    expect([...result.dishIds]).toEqual(["a"]);
  });
});
