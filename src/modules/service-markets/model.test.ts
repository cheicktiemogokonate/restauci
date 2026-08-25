import { describe, expect, it } from "vitest";
import {
  isServiceMarketCapabilityActive,
  validateLocationSample,
} from "./model";

const NOW = new Date("2026-08-23T10:00:00.000Z");

describe("service market location policy", () => {
  it("accepts a fresh and accurate discovery position", () => {
    expect(
      validateLocationSample(
        {
          lat: 5.35,
          lng: -4.01,
          accuracyMeters: 50,
          capturedAt: "2026-08-23T09:55:00.000Z",
        },
        "discovery",
        NOW,
      ),
    ).toBeNull();
  });

  it("rejects stale checkout positions", () => {
    expect(
      validateLocationSample(
        {
          lat: 5.35,
          lng: -4.01,
          accuracyMeters: 50,
          capturedAt: "2026-08-23T09:54:59.000Z",
        },
        "checkout",
        NOW,
      ),
    ).toEqual({ status: "stale_location", maxAgeMs: 300_000 });
  });

  it("rejects imprecise and invalid samples", () => {
    expect(
      validateLocationSample(
        {
          lat: 5.35,
          lng: -4.01,
          accuracyMeters: 501,
          capturedAt: NOW.toISOString(),
        },
        "checkout",
        NOW,
      ),
    ).toEqual({ status: "imprecise_location", maxAccuracyMeters: 500 });
    expect(
      validateLocationSample(
        {
          lat: 95,
          lng: -4.01,
          accuracyMeters: 10,
          capturedAt: NOW.toISOString(),
        },
        "discovery",
        NOW,
      ),
    ).toEqual({ status: "invalid_coordinates" });
  });
});

describe("service market capabilities", () => {
  it("keeps activity activation explicit", () => {
    expect(isServiceMarketCapabilityActive("active")).toBe(true);
    expect(isServiceMarketCapabilityActive("disabled")).toBe(false);
    expect(isServiceMarketCapabilityActive("prelaunch")).toBe(false);
    expect(isServiceMarketCapabilityActive("paused")).toBe(false);
  });
});
