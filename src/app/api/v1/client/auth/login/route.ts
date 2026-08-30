import { getClientIp } from "@/lib/api/client-ip";
import { apiResponse } from "@/lib/api/response";
import { validateBody } from "@/lib/api/validate";
import {
  createSessionId,
  signClientAccessToken,
  signClientRefreshToken,
} from "@/lib/auth";
import { db } from "@/lib/db";
import { clients } from "@/lib/db/schema";
import { createLogger } from "@/lib/logger";
import {
  authAccountLimiter,
  checkRateLimit,
  clientAuthLimiter,
} from "@/lib/rate-limit";
import { securityIdentifier } from "@/lib/security/identifier";
import { compare } from "bcryptjs";
import { eq } from "drizzle-orm";
import { NextRequest } from "next/server";
import { z } from "zod";
import { applyClientRefreshTransport } from "@/lib/api/client-session-cookie";
import { clientTokenTransportSchema } from "@/lib/api/client-token-transport";

const log = createLogger("v1-client-login");

const loginSchema = z.object({
  telephone: z.string().min(8),
  password: z.string().min(1).max(128),
  rememberMe: z.boolean().default(false),
  tokenTransport: clientTokenTransportSchema,
});

export async function POST(req: NextRequest) {
  const bypassRateLimit =
    process.env.NODE_ENV !== "production" && process.env.E2E_TEST === "true";
  if (!bypassRateLimit) {
    const ip = getClientIp(req);
    const rl = await checkRateLimit(clientAuthLimiter, ip);
    if (rl) return rl;
  }

  const { data, error } = await validateBody(req, loginSchema);
  if (error) return error;

  const accountId = securityIdentifier("client-phone", data.telephone);
  if (!bypassRateLimit) {
    const accountRateLimit = await checkRateLimit(authAccountLimiter, accountId);
    if (accountRateLimit) return accountRateLimit;
  }

  try {
    const [client] = await db
      .select({
        id: clients.id,
        nom: clients.nom,
        telephone: clients.telephone,
        email: clients.email,
        password: clients.password,
        actif: clients.actif,
      })
      .from(clients)
      .where(eq(clients.telephone, data.telephone))
      .limit(1);

    // Message générique pour éviter l'énumération
    const erreurGenerique = "Numéro de téléphone ou mot de passe incorrect";

    if (!client || !client.password) {
      await compare(
        data.password,
        "$2b$12$uTgttD2C7DC66CkZOWNP..p1.dVZb72d./VYmD08jia4VsjYPs3O2",
      );
      return apiResponse.unauthorized(erreurGenerique);
    }

    const isValid = await compare(data.password, client.password);
    if (!isValid) {
      log.warn({ clientId: client.id }, "Mauvais mot de passe client");
      return apiResponse.unauthorized(erreurGenerique);
    }

    if (!client.actif) {
      return apiResponse.error(
        "Votre compte a été désactivé. Contactez le support.",
        "FORBIDDEN",
        { status: 403 },
      );
    }

    const refreshMaxAge = data.rememberMe ? 30 * 24 * 3600 : 7 * 24 * 3600;
    const now = Math.floor(Date.now() / 1_000);
    const sessionExpiresAt = now + refreshMaxAge;
    const sessionId = createSessionId();

    const [accessToken, refreshToken] = await Promise.all([
      signClientAccessToken({ clientId: client.id, sessionId }),
      signClientRefreshToken(
        {
          clientId: client.id,
          sessionId,
          sessionDuration: data.rememberMe ? "extended" : "standard",
          sessionExpiresAt,
        },
        sessionExpiresAt,
      ),
    ]);

    log.info({ clientId: client.id }, "Client connecté");

    // Ne pas retourner le hash du mot de passe
    const { password: _password, ...clientSafe } = client;
    void _password;

    const response = apiResponse.success({
      client: clientSafe,
      tokens: {
        accessToken,
        ...(data.tokenTransport === "json" ? { refreshToken } : {}),
        expiresIn: 15 * 60,
      },
    });
    applyClientRefreshTransport(response, {
      transport: data.tokenTransport,
      token: refreshToken,
      maxAge: refreshMaxAge,
    });
    return response;
  } catch (err) {
    log.error({ err }, "Erreur lors de la connexion client");
    return apiResponse.internalError();
  }
}
