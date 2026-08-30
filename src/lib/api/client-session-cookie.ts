import type { NextResponse } from "next/server";

const LEGACY_CLIENT_REFRESH_COOKIE = "toutci_client_refresh";
export const CLIENT_REFRESH_COOKIE =
  process.env.NODE_ENV === "production"
    ? "__Secure-toutci_client_refresh"
    : LEGACY_CLIENT_REFRESH_COOKIE;

export function setClientRefreshCookie(
  response: NextResponse,
  token: string,
  maxAge: number,
) {
  response.cookies.set(CLIENT_REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/api/v1/client/auth",
    maxAge,
    priority: "high",
  });
}

export function clearClientRefreshCookie(response: NextResponse) {
  for (const name of new Set([
    CLIENT_REFRESH_COOKIE,
    LEGACY_CLIENT_REFRESH_COOKIE,
  ])) {
    response.cookies.set(name, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/api/v1/client/auth",
      maxAge: 0,
      priority: "high",
    });
  }
}

export function applyClientRefreshTransport(
  response: NextResponse,
  input: {
    transport: "cookie" | "json";
    token: string;
    maxAge: number;
  },
) {
  if (input.transport === "json") {
    clearClientRefreshCookie(response);
    return;
  }
  setClientRefreshCookie(response, input.token, input.maxAge);
}
