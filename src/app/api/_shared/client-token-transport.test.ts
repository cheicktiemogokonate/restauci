import { describe, expect, it } from "vitest";
import {
  clientRefreshRequestSchema,
  getClientRefreshLifetime,
  resolveClientRefreshToken,
} from "./client-token-transport";

describe("transport des refresh tokens client", () => {
  it("conserve le cookie comme mode web par défaut", () => {
    expect(clientRefreshRequestSchema.parse({})).toEqual({
      tokenTransport: "cookie",
    });
    expect(
      resolveClientRefreshToken({
        transport: "cookie",
        cookieToken: "cookie-token",
      }),
    ).toBe("cookie-token");
  });

  it("exige le token dans le body en mode natif", () => {
    expect(
      clientRefreshRequestSchema.safeParse({ tokenTransport: "json" }).success,
    ).toBe(false);
    expect(
      resolveClientRefreshToken({
        transport: "json",
        cookieToken: "secret-http-only",
      }),
    ).toBeNull();
  });

  it("préserve la durée remember-me lors des rotations", () => {
    expect(getClientRefreshLifetime("standard")).toEqual({
      expiresIn: "7d",
      maxAge: 604_800,
    });
    expect(getClientRefreshLifetime("extended")).toEqual({
      expiresIn: "30d",
      maxAge: 2_592_000,
    });
  });
});
