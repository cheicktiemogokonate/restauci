import { describe, expect, it } from "vitest";
import {
  createServiceMarketSchema,
  createServiceMarketVersionSchema,
  setServiceMarketCapabilitySchema,
} from "./contracts";

const adminId = "admin-test";
const serviceMarketId = "00000000-0000-4000-8000-000000000001";
const areaId = "00000000-0000-4000-8000-000000000002";

describe("contrats administratifs Service Markets", () => {
  it("normalise le pays et refuse les codes ambigus", () => {
    expect(
      createServiceMarketSchema.parse({
        code: "grand-abidjan",
        name: "Grand Abidjan",
        countryCode: "ci",
        adminId,
      }).countryCode,
    ).toBe("CI");
    expect(
      createServiceMarketSchema.safeParse({
        code: "Grand Abidjan",
        name: "Grand Abidjan",
        countryCode: "CI",
        adminId,
      }).success,
    ).toBe(false);
  });

  it("exige une unité incluse et interdit inclusion/exclusion simultanées", () => {
    expect(
      createServiceMarketVersionSchema.safeParse({
        serviceMarketId,
        includeSourceAreaIds: [],
        adminId,
      }).success,
    ).toBe(false);
    expect(
      createServiceMarketVersionSchema.safeParse({
        serviceMarketId,
        includeSourceAreaIds: [areaId],
        excludeSourceAreaIds: [areaId],
        adminId,
      }).success,
    ).toBe(false);
  });

  it("garde les capacités indépendantes par activité", () => {
    expect(
      setServiceMarketCapabilitySchema.parse({
        serviceMarketId,
        activityType: "residence",
        status: "paused",
        adminId,
      }),
    ).toMatchObject({ activityType: "residence", status: "paused" });
  });
});
