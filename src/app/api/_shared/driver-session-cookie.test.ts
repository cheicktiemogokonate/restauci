import { NextResponse } from "next/server";
import { describe, expect, it } from "vitest";
import {
  applyDriverRefreshTransport,
  DRIVER_REFRESH_COOKIE,
} from "./driver-session-cookie";

describe("transport du cookie refresh livreur", () => {
  it("pose un cookie HttpOnly limité aux routes d'authentification", () => {
    const response = NextResponse.json({ ok: true });
    applyDriverRefreshTransport(response, {
      transport: "cookie",
      token: "refresh-web",
      maxAge: 600,
    });
    const cookie = response.headers.get("set-cookie") ?? "";
    expect(cookie).toContain(`${DRIVER_REFRESH_COOKIE}=refresh-web`);
    expect(cookie.toLowerCase()).toContain("httponly");
    expect(cookie).toContain("Path=/api/v1/livreur/auth");
    expect(cookie).toContain("SameSite=strict");
  });

  it("efface le cookie lorsque le transport JSON est choisi", () => {
    const response = NextResponse.json({ ok: true });
    applyDriverRefreshTransport(response, {
      transport: "json",
      token: "refresh-native",
      maxAge: 600,
    });
    const cookie = response.headers.get("set-cookie") ?? "";
    expect(cookie).toContain(`${DRIVER_REFRESH_COOKIE}=`);
    expect(cookie).not.toContain("refresh-native");
    expect(cookie).toContain("Max-Age=0");
  });
});
