import type { NextResponse } from "next/server";
import type { DriverTokenTransport } from "./driver-token-transport";

const LEGACY_DRIVER_REFRESH_COOKIE = "restauci_driver_refresh";
export const DRIVER_REFRESH_COOKIE =
  process.env.NODE_ENV === "production"
    ? "__Secure-restauci_driver_refresh"
    : LEGACY_DRIVER_REFRESH_COOKIE;

export function setDriverRefreshCookie(
  response: NextResponse,
  token: string,
  maxAge: number,
) {
  response.cookies.set(DRIVER_REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/api/v1/livreur/auth",
    maxAge,
    priority: "high",
  });
}

export function clearDriverRefreshCookie(response: NextResponse) {
  for (const name of new Set([
    DRIVER_REFRESH_COOKIE,
    LEGACY_DRIVER_REFRESH_COOKIE,
  ])) {
    response.cookies.set(name, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/api/v1/livreur/auth",
      maxAge: 0,
      priority: "high",
    });
  }
}

export function applyDriverRefreshTransport(
  response: NextResponse,
  input: {
    transport: DriverTokenTransport;
    token: string;
    maxAge: number;
  },
) {
  if (input.transport === "json") {
    clearDriverRefreshCookie(response);
    return;
  }
  setDriverRefreshCookie(response, input.token, input.maxAge);
}
