import { describe, expect, it } from "vitest";
import {
  canEditIdentityVerification,
  isIdentityDocumentExpired,
  isIdentityDocumentSetComplete,
  requiredIdentityDocumentSides,
} from "./model";

describe("identity verification model", () => {
  it("requires both sides for a national identity card", () => {
    expect(requiredIdentityDocumentSides("national_id")).toEqual(["front", "back"]);
    expect(isIdentityDocumentSetComplete({ documentType: "national_id", documentSides: ["front"] })).toBe(false);
    expect(isIdentityDocumentSetComplete({ documentType: "national_id", documentSides: ["back", "front"] })).toBe(true);
  });

  it("requires only the identity page for a passport", () => {
    expect(requiredIdentityDocumentSides("passport")).toEqual(["front"]);
    expect(isIdentityDocumentSetComplete({ documentType: "passport", documentSides: ["front"] })).toBe(true);
  });

  it("allows edits only before submission or after rejection", () => {
    expect(canEditIdentityVerification("not_submitted")).toBe(true);
    expect(canEditIdentityVerification("rejected")).toBe(true);
    expect(canEditIdentityVerification("pending")).toBe(false);
    expect(canEditIdentityVerification("verified")).toBe(false);
  });

  it("treats a document expiring today as unusable", () => {
    expect(isIdentityDocumentExpired("2026-08-23", "2026-08-23")).toBe(true);
    expect(isIdentityDocumentExpired("2026-08-24", "2026-08-23")).toBe(false);
  });
});
