import {
  CLIENT_REFRESH_COOKIE,
  clearClientRefreshCookie,
} from "@/app/api/_shared/client-session-cookie";
import { apiResponse } from "@/app/api/_shared/response";
import { blacklistToken, revokeSession } from "@/infrastructure/auth/revocation";
import {
  verifyClientAccessToken,
  verifyClientRefreshToken,
} from "@/modules/auth/server";
import { createLogger } from "@/infrastructure/logger";
import { NextRequest } from "next/server";
import {
  readOptionalClientLogoutBody,
  resolveClientRefreshToken,
} from "@/app/api/_shared/client-token-transport";

const log = createLogger("v1-client-auth-logout");

export async function POST(request: NextRequest) {
  const body = await readOptionalClientLogoutBody(request);
  if (!body) {
    return apiResponse.error("Corps JSON invalide", "BAD_REQUEST", {
      status: 400,
    });
  }
  const accessHeader = request.headers.get("authorization");
  const accessToken = accessHeader?.startsWith("Bearer ")
    ? accessHeader.slice(7)
    : null;
  const refreshToken = resolveClientRefreshToken({
    transport: body.tokenTransport,
    bodyToken: body.refreshToken,
    cookieToken: request.cookies.get(CLIENT_REFRESH_COOKIE)?.value,
  });

  try {
    const [accessPayload, refreshPayload] = await Promise.all([
      accessToken ? verifyClientAccessToken(accessToken) : null,
      refreshToken ? verifyClientRefreshToken(refreshToken) : null,
    ]);
    if ((accessToken && !accessPayload) || (refreshToken && !refreshPayload)) {
      const response = apiResponse.unauthorized("Jeton de session invalide");
      clearClientRefreshCookie(response);
      return response;
    }
    if (
      accessPayload &&
      refreshPayload &&
      (accessPayload.clientId !== refreshPayload.clientId ||
        accessPayload.sessionId !== refreshPayload.sessionId)
    ) {
      const response = apiResponse.unauthorized("Jetons de sessions différentes");
      clearClientRefreshCookie(response);
      return response;
    }

    await Promise.all([
      ...(accessToken && accessPayload
        ? [blacklistToken(accessToken, accessPayload.exp)]
        : []),
      ...(refreshToken && refreshPayload
        ? [blacklistToken(refreshToken, refreshPayload.exp)]
        : []),
      ...(refreshPayload
        ? [
            revokeSession(
              refreshPayload.sessionId,
              refreshPayload.sessionExpiresAt,
            ),
          ]
        : []),
    ]);
  } catch (err) {
    log.error({ err }, "Révocation de session client incomplète");
    const response = apiResponse.error(
      "Déconnexion sécurisée temporairement indisponible",
      "SERVICE_UNAVAILABLE",
      { status: 503 },
    );
    clearClientRefreshCookie(response);
    return response;
  }

  const response = apiResponse.success({ loggedOut: true });
  clearClientRefreshCookie(response);
  return response;
}
