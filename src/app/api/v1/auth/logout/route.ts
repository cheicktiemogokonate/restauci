import { getMobileSession } from "@/lib/api/auth-mobile";
import { blacklistToken } from "@/lib/api/token-blacklist";
import { apiResponse } from "@/lib/api/response";
import { verifyToken } from "@/lib/auth";
import { createLogger } from "@/lib/logger";
import { NextRequest } from "next/server";
import { z } from "zod";

const log = createLogger("v1-auth-logout");

const logoutBodySchema = z.object({
  refreshToken: z.string().min(1).optional(),
});

function tokenExp(payload: Record<string, unknown> | null): number {
  const exp = typeof payload?.exp === "number" ? payload.exp : 0;
  const now = Math.floor(Date.now() / 1000);
  return exp > now ? exp : now + 24 * 3600;
}

export async function POST(request: NextRequest) {
  const { error } = await getMobileSession(request);
  if (error) return error;

  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return apiResponse.unauthorized("Token manquant ou invalide");
    }

    const accessToken = authHeader.slice(7);

    // Blacklister l'access token jusqu'à son exp réelle (et non un TTL fixe).
    await blacklistToken(accessToken, tokenExp(await verifyToken(accessToken)));

    // Révoquer aussi le refresh token si l'app le transmet : sans cela,
    // la session peut être régénérée après le logout.
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      body = null; // corps vide toléré (rétrocompatibilité anciens clients)
    }
    const parsed = logoutBodySchema.safeParse(body);
    if (parsed.success && parsed.data.refreshToken) {
      const refreshPayload = await verifyToken(parsed.data.refreshToken);
      if (refreshPayload && refreshPayload.type === "refresh") {
        await blacklistToken(
          parsed.data.refreshToken,
          tokenExp(refreshPayload),
        );
        log.info("Refresh token révoqué lors du logout");
      }
    }

    return apiResponse.success({ message: "Déconnexion réussie" });
  } catch (err) {
    log.error({ err }, "Erreur déconnexion mobile");
    return apiResponse.internalError();
  }
}
