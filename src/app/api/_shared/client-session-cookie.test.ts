import { NextResponse } from "next/server";
import { describe, expect, it } from "vitest";
import {
  applyClientRefreshTransport,
  CLIENT_REFRESH_COOKIE,
} from "./client-session-cookie";

describe("transport du cookie refresh client", () => {
  it("pose un cookie HttpOnly uniquement pour le transport web", () => {
    const response = NextResponse.json({ ok: true });
    applyClientRefreshTransport(response, {
      transport: "cookie",
      token: "refresh-web",
      maxAge: 600,
    });

    const cookie = response.headers.get("set-cookie") ?? "";
    expect(cookie).toContain(`${CLIENT_REFRESH_COOKIE}=refresh-web`);
    expect(cookie.toLowerCase()).toContain("httponly");
    expect(cookie).toContain("Max-Age=600");
  });

  it("efface le cookie résiduel lorsque le transport natif est choisi", () => {
    const response = NextResponse.json({ ok: true });
    applyClientRefreshTransport(response, {
      transport: "json",
      token: "refresh-native",
      maxAge: 600,
    });

    const cookie = response.headers.get("set-cookie") ?? "";
    expect(cookie).toContain(`${CLIENT_REFRESH_COOKIE}=`);
    expect(cookie).not.toContain("refresh-native");
    expect(cookie).toContain("Max-Age=0");
  });
});
