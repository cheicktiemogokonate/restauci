import { describe, expect, it } from "vitest";
import { verifyTotp } from "./totp";

describe("TOTP administrateur", () => {
  const rfcSecret = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";

  it("valide le vecteur RFC 6238 tronqué à six chiffres", () => {
    expect(verifyTotp("287082", rfcSecret, 59_000, 0)).toBe(1);
  });

  it("refuse un code erroné ou mal formé", () => {
    expect(verifyTotp("287083", rfcSecret, 59_000, 0)).toBeNull();
    expect(verifyTotp("12345", rfcSecret, 59_000, 0)).toBeNull();
  });
});
