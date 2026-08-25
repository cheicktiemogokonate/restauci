import { getClientIp } from "@/lib/api/client-ip";
import { blacklistToken, isTokenBlacklisted } from "@/lib/api/token-blacklist";
import { apiResponse } from "@/lib/api/response";
import { validateBody } from "@/lib/api/validate";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { apiLimiter, checkRateLimit } from "@/lib/rate-limit";
import { verifyToken } from "@/lib/auth";
import { createLogger } from "@/lib/logger";
import { SignJWT } from "jose";
import { eq } from "drizzle-orm";
import { env } from "@/lib/env";
import { NextRequest } from "next/server";
import { z } from "zod";

const log = createLogger("v1-auth-refresh");

const ACCESS_TTL_S = 24 * 3600;
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
    const payload = await verifyToken(data.refreshToken);
    if (!payload?.userId || payload.type !== "refresh") {
      return apiResponse.unauthorized("Refresh token invalide");
    }

    // 2. Vérifier que le token n'a pas été révoqué (logout / rotation).
    //    Si Redis est indisponible on continue : l'étape 3 reste bloquante
    //    pour les comptes suspendus.
    let revoked = false;
    try {
      revoked = await isTokenBlacklisted(data.refreshToken);
    } catch (redisErr) {
      log.warn(
        { err: redisErr instanceof Error ? redisErr.message : "unknown" },
        "Blacklist indisponible lors du refresh",
      );
    }
    if (revoked) {
      return apiResponse.unauthorized(
        "Refresh token révoqué. Reconnectez-vous.",
      );
    }

    // 3. Le rôle et le statut du compte viennent TOUJOURS de la base :
    //    suspension, rétrogradation ou suppression prennent effet immédiat.
    const [user] = await db
      .select({ id: users.id, role: users.role, suspendu: users.suspendu })
      .from(users)
      .where(eq(users.id, String(payload.userId)))
      .limit(1);

    if (!user || user.suspendu) {
      return apiResponse.forbidden("Compte suspendu ou introuvable");
    }

    // 4. Rotation : l'ancien refresh token est blacklisté jusqu'à son exp
    //    réel et un nouveau couple est émis. La durée de vie absolue de la
    //    session est plafonnée par l'exp du refresh d'origine (pas de
    //    prolongation infinie).
    const now = Math.floor(Date.now() / 1000);
    const origExp = typeof payload.exp === "number" ? payload.exp : now;
    const newRefreshExp = Math.min(now + REFRESH_SLIDING_S, origExp);

    if (newRefreshExp <= now) {
      return apiResponse.unauthorized("Refresh token expiré");
    }

    const JWT_SECRET = new TextEncoder().encode(env.JWT_SECRET);

    const [accessToken, refreshToken] = await Promise.all([
      new SignJWT({ userId: user.id, role: user.role, type: "access" })
        .setProtectedHeader({ alg: "HS256" })
        .setExpirationTime(`${ACCESS_TTL_S}s`)
        .sign(JWT_SECRET),
      new SignJWT({ userId: user.id, type: "refresh" })
        .setProtectedHeader({ alg: "HS256" })
        .setExpirationTime(newRefreshExp)
        .sign(JWT_SECRET),
    ]);

    try {
      await blacklistToken(data.refreshToken, origExp);
    } catch (redisErr) {
      log.error(
        { err: redisErr instanceof Error ? redisErr.message : "unknown" },
        "Échec blacklisting de l'ancien refresh token (rotation)",
      );
    }

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
