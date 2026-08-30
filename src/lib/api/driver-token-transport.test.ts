import { describe, expect, it } from "vitest";
import {
  driverTokenTransportSchema,
  driverRefreshRequestSchema,
  resolveDriverRefreshToken,
} from "./driver-token-transport";
import { driverLoginSchema } from "@/modules/deliveries/contracts";

describe("transport des refresh tokens livreur", () => {
  it("étend le contrat de connexion strict avec le transport", () => {
    const schema = driverLoginSchema.extend({
      tokenTransport: driverTokenTransportSchema,
    });
    expect(
      schema.parse({
        loginId: "RESTAUCI-INVALID",
        password: "wrong-password",
        tokenTransport: "cookie",
      }),
    ).toEqual({
      loginId: "RESTAUCI-INVALID",
      password: "wrong-password",
      tokenTransport: "cookie",
    });
  });

  it("utilise le cookie HttpOnly par défaut", () => {
    expect(driverRefreshRequestSchema.parse({})).toEqual({
      tokenTransport: "cookie",
    });
    expect(
      resolveDriverRefreshToken({
        transport: "cookie",
        cookieToken: "cookie-token",
      }),
    ).toBe("cookie-token");
  });

  it("exige le refresh token dans le JSON pour un client natif", () => {
    expect(
      driverRefreshRequestSchema.safeParse({ tokenTransport: "json" }).success,
    ).toBe(false);
    expect(
      resolveDriverRefreshToken({
        transport: "json",
        cookieToken: "secret-http-only",
      }),
    ).toBeNull();
  });
});
