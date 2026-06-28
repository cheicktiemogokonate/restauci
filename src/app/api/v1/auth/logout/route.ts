import { getMobileSession } from "@/lib/api/auth-mobile";
import { apiResponse } from "@/lib/api/response";
import { redis } from "@/lib/cache/redis";
import { createLogger } from "@/lib/logger";
import { NextRequest } from "next/server";

const log = createLogger("v1-auth-logout");

export async function POST(request: NextRequest) {
  const { error } = await getMobileSession(request);
  if (error) return error;

  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return apiResponse.unauthorized("Token manquant ou invalide");
    }

    const token = authHeader.slice(7);

    // Stocker le token blacklisté pendant 24h (durée max d'un access token)
    await redis.setex(`restauci:blacklist:${token}`, 24 * 3600, "1");

    return apiResponse.success({ message: "Déconnexion réussie" });
  } catch (err) {
    log.error({ err }, "Erreur déconnexion mobile");
    return apiResponse.internalError();
  }
}
