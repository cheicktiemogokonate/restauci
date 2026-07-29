import { describe, expect, it } from "vitest";
import { detectImageType, validateImageType } from "./image";

describe("image media validation", () => {
  it("detects supported image signatures", () => {
    expect(detectImageType(new Uint8Array([0xff, 0xd8, 0xff]))).toEqual({
      contentType: "image/jpeg",
      extension: "jpg",
    });
    expect(
      detectImageType(
        new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      ),
    ).toEqual({ contentType: "image/png", extension: "png" });
    expect(
      detectImageType(
        new Uint8Array([
          0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50,
        ]),
      ),
    ).toEqual({ contentType: "image/webp", extension: "webp" });
  });

  it("rejects unknown files and mismatched declared types", () => {
    expect(detectImageType(new Uint8Array([0x25, 0x50, 0x44, 0x46]))).toBeNull();
    expect(
      validateImageType(
        new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        "image/jpeg",
      ),
    ).toBeNull();
  });
});
