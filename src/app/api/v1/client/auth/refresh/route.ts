import { apiResponse } from "@/app/api/_shared/response";
import { validateBody } from "@/app/api/_shared/validate";
import {
  signClientAccessToken,
  signClientRefreshToken,
  verifyClientRefreshToken,
} from "@/modules/auth/server";
import { createLogger } from "@/infrastructure/logger";
import { NextRequest } from "next/server";
import { getClientSessionState } from "@/modules/clients/server";
import {
  CLIENT_REFRESH_COOKIE,
  applyClientRefreshTransport,
  clearClientRefreshCookie,
} from "@/app/api/_shared/client-session-cookie";
import {
  consumeTokenOnce,
  isOwnerSessionRevoked,
  isSessionRevoked,
  revokeSession,
} from "@/infrastructure/auth/revocation";
import {
  clientRefreshRequestSchema,
  getClientRefreshLifetime,
  resolveClientRefreshToken,
} from "@/app/api/_shared/client-token-transport";

const log = createLogger("v1-client-auth-refresh");

export async function POST(request: NextRequest) {
  const { data, error } = await validateBody(
    request,
    clientRefreshRequestSchema,
  );
  if (error) return error;

  try {
    // Vérifier le refresh token (type: "client-refresh")
    const refreshToken = resolveClientRefreshToken({
      transport: data.tokenTransport,
      bodyToken: data.refreshToken,
      cookieToken: request.cookies.get(CLIENT_REFRESH_COOKIE)?.value,
    });
    if (!refreshToken) return apiResponse.unauthorized("Session expirée");
    const payload = await verifyClientRefreshToken(refreshToken);
    if (!payload) {
      return apiResponse.unauthorized("Refresh token client invalide");
    }

    const now = Math.floor(Date.now() / 1_000);
    if (payload.sessionExpiresAt <= now) {
      const response = apiResponse.unauthorized("Session expirée");
      clearClientRefreshCookie(response);
      return response;
    }

    let consumed: boolean;
    try {
      if (
        (await isSessionRevoked(payload.sessionId)) ||
        (await isOwnerSessionRevoked(
          "client",
          payload.clientId,
          payload.issuedAtMs,
        ))
      ) {
        const response = apiResponse.unauthorized("Session révoquée");
        clearClientRefreshCookie(response);
        return response;
      }
      consumed = await consumeTokenOnce(refreshToken, payload.exp);
    } catch (redisError) {
      log.error({ err: redisError }, "Registre de révocation indisponible");
      return apiResponse.error(
        "Renouvellement temporairement indisponible",
        "SERVICE_UNAVAILABLE",
        { status: 503 },
      );
    }
    if (!consumed) {
      try {
        await revokeSession(payload.sessionId, payload.sessionExpiresAt);
      } catch (redisError) {
        log.error({ err: redisError }, "Révocation de famille incomplète");
        const response = apiResponse.error(
          "Vérification de session temporairement indisponible",
          "SERVICE_UNAVAILABLE",
          { status: 503 },
        );
        clearClientRefreshCookie(response);
        return response;
      }
      const response = apiResponse.unauthorized(
        "Réutilisation de session détectée. La session a été révoquée.",
      );
      clearClientRefreshCookie(response);
      return response;
    }

    const client = await getClientSessionState(payload.clientId);
    if (!client?.active) {
      const response = apiResponse.forbidden("Compte client désactivé");
      clearClientRefreshCookie(response);
      return response;
    }

    const refreshLifetime = getClientRefreshLifetime(payload.sessionDuration);
    const sessionDuration =
      payload.sessionDuration === "extended" ? "extended" : "standard";
    const newRefreshExp = Math.min(
      now + refreshLifetime.maxAge,
      payload.sessionExpiresAt,
    );
    if (newRefreshExp <= now) {
      const response = apiResponse.unauthorized("Session expirée");
      clearClientRefreshCookie(response);
      return response;
    }

    const [newAccessToken, newRefreshToken] = await Promise.all([
      signClientAccessToken({
        clientId: client.id,
        sessionId: payload.sessionId,
      }),
      signClientRefreshToken(
        {
          clientId: client.id,
          sessionId: payload.sessionId,
          sessionDuration,
          sessionExpiresAt: payload.sessionExpiresAt,
        },
        newRefreshExp,
      ),
    ]);

    log.info({ clientId: payload.clientId }, "Token client refreshé");

    const response = apiResponse.success({
      accessToken: newAccessToken,
      ...(data.tokenTransport === "json"
        ? { refreshToken: newRefreshToken }
        : {}),
      expiresIn: 15 * 60,
    });
    applyClientRefreshTransport(response, {
      transport: data.tokenTransport,
      token: newRefreshToken,
      maxAge: newRefreshExp - now,
    });
    return response;
  } catch (err) {
    log.error({ err }, "Erreur refresh token client");
    return apiResponse.unauthorized("Refresh token expiré ou invalide");
  }
}
