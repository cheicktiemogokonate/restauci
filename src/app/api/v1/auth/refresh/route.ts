import { getClientIp } from "@/shared/http/client-ip";
import {
  consumeTokenOnce,
  isOwnerSessionRevoked,
  isSessionRevoked,
  revokeSession,
} from "@/infrastructure/auth/revocation";
import { apiResponse } from "@/app/api/_shared/response";
import { validateBody } from "@/app/api/_shared/validate";
import { apiLimiter, checkRateLimit } from "@/infrastructure/rate-limit";
import {
  signPartnerAccessToken,
  signPartnerRefreshToken,
  verifyPartnerRefreshToken,
} from "@/modules/auth/server";
import { getActivePartnerUserIdentity } from "@/modules/auth/server";
import { createLogger } from "@/infrastructure/logger";
import { NextRequest } from "next/server";
import { z } from "zod";

const log = createLogger("v1-auth-refresh");

const ACCESS_TTL_S = 15 * 60;
const REFRESH_SLIDING_S = 7 * 24 * 3600;

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rl = await checkRateLimit(apiLimiter, ip);
  if (rl) return rl;

  const { data, error } = await validateBody(request, refreshSchema);
  if (error) return error;

  try {
    // 1. Vérifier la signature et le TYPE du token : seul un refresh token
    //    (émis par /login ou par une rotation précédente) est accepté.
    //    Un access token — même valide — est refusé ici.
    const payload = await verifyPartnerRefreshToken(data.refreshToken);
    if (!payload) {
      return apiResponse.unauthorized("Refresh token invalide");
    }

    const now = Math.floor(Date.now() / 1000);
    if (payload.sessionExpiresAt <= now) {
      return apiResponse.unauthorized("Session expirée");
    }

    // 2. Consommer le refresh de façon atomique. Une rotation concurrente ou
    //    un logout a déjà créé la même clé et rend cette requête invalide.
    let consumed: boolean;
    try {
      if (
        (await isSessionRevoked(payload.sessionId)) ||
        (await isOwnerSessionRevoked(
          "user",
          payload.userId,
          payload.issuedAtMs,
        ))
      ) {
        return apiResponse.unauthorized("Session révoquée. Reconnectez-vous.");
      }
      consumed = await consumeTokenOnce(data.refreshToken, payload.exp);
    } catch (redisErr) {
      log.error(
        { err: redisErr instanceof Error ? redisErr.message : "unknown" },
        "Registre de révocation indisponible lors du refresh",
      );
      return apiResponse.error(
        "Renouvellement temporairement indisponible",
        "SERVICE_UNAVAILABLE",
        { status: 503 },
      );
    }
    if (!consumed) {
      try {
        await revokeSession(payload.sessionId, payload.sessionExpiresAt);
      } catch (redisErr) {
        log.error({ err: redisErr }, "Révocation de famille incomplète");
        return apiResponse.error(
          "Vérification de session temporairement indisponible",
          "SERVICE_UNAVAILABLE",
          { status: 503 },
        );
      }
      return apiResponse.unauthorized(
        "Réutilisation de session détectée. Toutes les sessions associées ont été révoquées.",
      );
    }

    // 3. Le rôle et le statut du compte viennent TOUJOURS de la base :
    //    suspension, rétrogradation ou suppression prennent effet immédiat.
    const user = await getActivePartnerUserIdentity(String(payload.userId));

    if (!user) {
      return apiResponse.forbidden("Compte suspendu ou introuvable");
    }

    // 4. Rotation : l'ancien refresh token est blacklisté jusqu'à son exp
    //    réel et un nouveau couple est émis. La durée de vie absolue de la
    //    session est plafonnée par l'exp du refresh d'origine (pas de
    //    prolongation infinie).
    const newRefreshExp = Math.min(
      now + REFRESH_SLIDING_S,
      payload.sessionExpiresAt,
    );

    if (newRefreshExp <= now) {
      return apiResponse.unauthorized("Refresh token expiré");
    }

    const [accessToken, refreshToken] = await Promise.all([
      signPartnerAccessToken({
        userId: user.id,
        role: user.role,
        sessionId: payload.sessionId,
      }),
      signPartnerRefreshToken(
        {
          userId: user.id,
          sessionId: payload.sessionId,
          sessionExpiresAt: payload.sessionExpiresAt,
        },
        newRefreshExp,
      ),
    ]);

    log.info({ userId: user.id }, "Tokens rafraîchis avec rotation");

    return apiResponse.success({
      accessToken,
      refreshToken,
      expiresIn: ACCESS_TTL_S,
    });
  } catch {
    return apiResponse.unauthorized("Refresh token expiré ou invalide");
  }
}
