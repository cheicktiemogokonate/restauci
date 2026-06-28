import { apiResponse } from "@/lib/api/response";
import { validateBody } from "@/lib/api/validate";
import { signToken, verifyToken } from "@/lib/auth";
import { createLogger } from "@/lib/logger";
import { NextRequest } from "next/server";
import { z } from "zod";

const log = createLogger("v1-client-auth-refresh");

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

export async function POST(request: NextRequest) {
  const { data, error } = await validateBody(request, refreshSchema);
  if (error) return error;

  try {
    // Vérifier le refresh token (type: "client-refresh")
    const payload = await verifyToken(data.refreshToken);

    if (!payload?.clientId || payload.type !== "client-refresh") {
      return apiResponse.unauthorized("Refresh token client invalide");
    }

    // Générer un nouveau access token pour le client
    const newAccessToken = await signToken(
      { clientId: payload.clientId, type: "client" },
      "24h",
    );

    log.info({ clientId: payload.clientId }, "Token client refreshé");

    return apiResponse.success({
      accessToken: newAccessToken,
      expiresIn: 24 * 3600,
    });
  } catch (err) {
    log.error({ err }, "Erreur refresh token client");
    return apiResponse.unauthorized("Refresh token expiré ou invalide");
  }
}
