import { apiResponse } from "@/lib/api/response";
import { validateBody } from "@/lib/api/validate";
import { signToken, verifyToken } from "@/lib/auth";
import { createLogger } from "@/lib/logger";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { clients } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  CLIENT_REFRESH_COOKIE,
  applyClientRefreshTransport,
  clearClientRefreshCookie,
} from "@/lib/api/client-session-cookie";
import {
  blacklistToken,
  isTokenBlacklisted,
} from "@/lib/api/token-blacklist";
import {
  clientRefreshRequestSchema,
  getClientRefreshLifetime,
  resolveClientRefreshToken,
} from "@/lib/api/client-token-transport";

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
    if (await isTokenBlacklisted(refreshToken)) {
      const response = apiResponse.unauthorized("Session expirée");
      clearClientRefreshCookie(response);
      return response;
    }

    const payload = await verifyToken(refreshToken);

    if (!payload?.clientId || payload.type !== "client-refresh") {
      return apiResponse.unauthorized("Refresh token client invalide");
    }

    const [client] = await db
      .select({ id: clients.id, actif: clients.actif })
      .from(clients)
      .where(eq(clients.id, payload.clientId as string))
      .limit(1);
    if (!client?.actif) {
      const response = apiResponse.forbidden("Compte client désactivé");
      clearClientRefreshCookie(response);
      return response;
    }

    const refreshLifetime = getClientRefreshLifetime(payload.sessionDuration);
    const sessionDuration =
      payload.sessionDuration === "extended" ? "extended" : "standard";
    const [newAccessToken, newRefreshToken] = await Promise.all([
      signToken({ clientId: client.id, type: "client" }, "15m"),
      signToken(
        { clientId: client.id, type: "client-refresh", sessionDuration },
        refreshLifetime.expiresIn,
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
    await blacklistToken(
      refreshToken,
      typeof payload.exp === "number" ? payload.exp : undefined,
    );
    applyClientRefreshTransport(response, {
      transport: data.tokenTransport,
      token: newRefreshToken,
      maxAge: refreshLifetime.maxAge,
    });
    return response;
  } catch (err) {
    log.error({ err }, "Erreur refresh token client");
    return apiResponse.unauthorized("Refresh token expiré ou invalide");
  }
}
