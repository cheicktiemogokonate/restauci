import type { NextResponse } from "next/server";

export const CLIENT_REFRESH_COOKIE = "toutci_client_refresh";

export function setClientRefreshCookie(
  response: NextResponse,
  token: string,
  maxAge: number,
) {
  response.cookies.set(CLIENT_REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/v1/client/auth",
    maxAge,
  });
}

export function clearClientRefreshCookie(response: NextResponse) {
  response.cookies.set(CLIENT_REFRESH_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/v1/client/auth",
    maxAge: 0,
  });
}
