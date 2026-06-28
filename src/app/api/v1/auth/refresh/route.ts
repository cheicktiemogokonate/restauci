import { NextRequest }  from "next/server";
import { z }            from "zod";
import { apiResponse }  from "@/lib/api/response";
import { validateBody } from "@/lib/api/validate";
import { createLogger } from "@/lib/logger";
import { verifyToken } from "@/lib/auth";  // adapte
import { SignJWT } from "jose";
import { env } from "@/lib/env";

const log = createLogger("v1-auth-refresh");

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

export async function POST(
  request: NextRequest
) {
  const { data, error } = await validateBody(request, refreshSchema);
  if (error) return error;

  try {
    // Vérifier le refresh token
    const payload = await verifyToken(data.refreshToken);

    if (!payload?.userId) {
      return apiResponse.unauthorized("Refresh token invalide");
    }

    // Générer un nouveau access token
    const JWT_SECRET = new TextEncoder().encode(env.JWT_SECRET);
    const newAccessToken = await new SignJWT({ userId: payload.userId, role: payload.role })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("24h")
      .sign(JWT_SECRET);

    log.info({ userId: payload.userId }, "Token refreshé");

    return apiResponse.success({
      accessToken: newAccessToken,
      expiresIn:   24 * 3600,
    });
  } catch {
    return apiResponse.unauthorized("Refresh token expiré ou invalide");
  }
}