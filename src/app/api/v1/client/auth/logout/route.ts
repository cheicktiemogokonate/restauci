import {
  CLIENT_REFRESH_COOKIE,
  clearClientRefreshCookie,
} from "@/lib/api/client-session-cookie";
import { apiResponse } from "@/lib/api/response";
import { blacklistToken } from "@/lib/api/token-blacklist";
import { verifyToken } from "@/lib/auth";
import { createLogger } from "@/lib/logger";
import { NextRequest } from "next/server";

const log = createLogger("v1-client-auth-logout");

export async function POST(request: NextRequest) {
  const accessHeader = request.headers.get("authorization");
  const accessToken = accessHeader?.startsWith("Bearer ")
    ? accessHeader.slice(7)
    : null;
  const refreshToken = request.cookies.get(CLIENT_REFRESH_COOKIE)?.value;

  try {
    await Promise.all(
      [accessToken, refreshToken]
        .filter((token): token is string => Boolean(token))
        .map(async (token) => {
          const payload = await verifyToken(token);
          await blacklistToken(
            token,
            typeof payload?.exp === "number" ? payload.exp : undefined,
          );
        }),
    );
  } catch (err) {
    log.error({ err }, "Révocation de session client incomplète");
  }

  const response = apiResponse.success({ loggedOut: true });
  clearClientRefreshCookie(response);
  return response;
}
