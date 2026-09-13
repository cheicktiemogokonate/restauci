import { getClientIp } from "@/shared/http/client-ip";
import { apiResponse } from "@/app/api/_shared/response";
import { validateBody } from "@/app/api/_shared/validate";
import {
  createSessionId,
  signClientAccessToken,
  signClientRefreshToken,
} from "@/modules/auth/server";
import { createLogger } from "@/infrastructure/logger";
import {
  authAccountLimiter,
  checkRateLimit,
  clientAuthLimiter,
} from "@/infrastructure/rate-limit";
import { securityIdentifier } from "@/infrastructure/security/identifier";
import { NextRequest } from "next/server";
import { z } from "zod";
import { applyClientRefreshTransport } from "@/app/api/_shared/client-session-cookie";
import { clientTokenTransportSchema } from "@/app/api/_shared/client-token-transport";
import { authenticateClientSchema } from "@/modules/clients/contracts";
import {
  authenticateClientCredentials,
  ClientDomainError,
} from "@/modules/clients/server";

const log = createLogger("v1-client-login");

const loginSchema = authenticateClientSchema.extend({
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
    const client = await authenticateClientCredentials({
      telephone: data.telephone,
      password: data.password,
    });

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

    const response = apiResponse.success({
      client,
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
    if (err instanceof ClientDomainError) {
      if (err.code === "CLIENT_CREDENTIALS_INVALID") {
        return apiResponse.unauthorized(err.message);
      }
      if (err.code === "CLIENT_INACTIVE") {
        return apiResponse.error(err.message, "FORBIDDEN", { status: 403 });
      }
    }
    log.error({ err }, "Erreur lors de la connexion client");
    return apiResponse.internalError();
  }
}
