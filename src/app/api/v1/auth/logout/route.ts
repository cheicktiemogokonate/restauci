import { getMobileSession } from "@/app/api/_shared/auth-mobile";
import { blacklistToken, revokeSession } from "@/infrastructure/auth/revocation";
import { apiResponse } from "@/app/api/_shared/response";
import {
  verifyPartnerAccessToken,
  verifyPartnerRefreshToken,
} from "@/modules/auth/server";
import { createLogger } from "@/infrastructure/logger";
import { NextRequest } from "next/server";
import { z } from "zod";

const log = createLogger("v1-auth-logout");

const logoutBodySchema = z.object({
  refreshToken: z.string().min(1),
});

export async function POST(request: NextRequest) {
  const { session, error } = await getMobileSession(request);
  if (error) return error;

  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return apiResponse.unauthorized("Token manquant ou invalide");
    }

    const accessToken = authHeader.slice(7);
    const accessPayload = await verifyPartnerAccessToken(accessToken);
    if (!accessPayload) return apiResponse.unauthorized("Token invalide");

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return apiResponse.error("Corps JSON invalide", "BAD_REQUEST", {
        status: 400,
      });
    }
    const parsed = logoutBodySchema.safeParse(body);
    if (!parsed.success) {
      return apiResponse.error("Refresh token requis", "BAD_REQUEST", {
        status: 400,
      });
    }

    const refreshPayload = await verifyPartnerRefreshToken(
      parsed.data.refreshToken,
    );
    if (
      !refreshPayload ||
      refreshPayload.userId !== session.userId ||
      refreshPayload.sessionId !== accessPayload.sessionId
    ) {
      return apiResponse.unauthorized("Refresh token invalide");
    }

    await Promise.all([
      blacklistToken(accessToken, accessPayload.exp),
      blacklistToken(parsed.data.refreshToken, refreshPayload.exp),
      revokeSession(accessPayload.sessionId, refreshPayload.sessionExpiresAt),
    ]);
    log.info({ sessionId: accessPayload.sessionId }, "Session mobile révoquée");

    return apiResponse.success({ message: "Déconnexion réussie" });
  } catch (err) {
    log.error({ err }, "Erreur déconnexion mobile");
    return apiResponse.error(
      "Déconnexion sécurisée temporairement indisponible",
      "SERVICE_UNAVAILABLE",
      { status: 503 },
    );
  }
}
