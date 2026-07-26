import { apiResponse } from "@/lib/api/response";
import { validateBody } from "@/lib/api/validate";
import { signToken, verifyToken } from "@/lib/auth";
import { createLogger } from "@/lib/logger";
import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { clients } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  CLIENT_REFRESH_COOKIE,
  clearClientRefreshCookie,
  setClientRefreshCookie,
} from "@/lib/api/client-session-cookie";
import {
  blacklistToken,
  isTokenBlacklisted,
} from "@/lib/api/token-blacklist";

const log = createLogger("v1-client-auth-refresh");

const refreshSchema = z.object({
  refreshToken: z.string().min(1).optional(),
});

export async function POST(request: NextRequest) {
  const { data, error } = await validateBody(request, refreshSchema);
  if (error) return error;

  try {
    // Vérifier le refresh token (type: "client-refresh")
    const refreshToken =
      data.refreshToken ?? request.cookies.get(CLIENT_REFRESH_COOKIE)?.value;
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

    const [newAccessToken, newRefreshToken] = await Promise.all([
      signToken({ clientId: client.id, type: "client" }, "15m"),
      signToken({ clientId: client.id, type: "client-refresh" }, "7d"),
    ]);

    log.info({ clientId: payload.clientId }, "Token client refreshé");

    const response = apiResponse.success({
      accessToken: newAccessToken,
      expiresIn: 15 * 60,
    });
    await blacklistToken(
      refreshToken,
      typeof payload.exp === "number" ? payload.exp : undefined,
    );
    setClientRefreshCookie(response, newRefreshToken, 7 * 24 * 3600);
    return response;
  } catch (err) {
    log.error({ err }, "Erreur refresh token client");
    return apiResponse.unauthorized("Refresh token expiré ou invalide");
  }
}
