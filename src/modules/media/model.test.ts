import { describe, expect, it } from "vitest";
import {
  getPublicMediaExpiration,
  isPublicMediaExpired,
  PUBLIC_MEDIA_TEMPORARY_RETENTION_HOURS,
} from "./model";

describe("public media lifecycle", () => {
  it("expires unattached uploads exactly after 24 hours", () => {
    const createdAt = new Date("2026-09-05T10:00:00.000Z");
    const expiresAt = getPublicMediaExpiration(createdAt);
    expect(PUBLIC_MEDIA_TEMPORARY_RETENTION_HOURS).toBe(24);
    expect(expiresAt.toISOString()).toBe("2026-09-06T10:00:00.000Z");
    expect(isPublicMediaExpired(expiresAt, new Date("2026-09-06T09:59:59.999Z"))).toBe(false);
    expect(isPublicMediaExpired(expiresAt, new Date("2026-09-06T10:00:00.000Z"))).toBe(true);
  });
});
