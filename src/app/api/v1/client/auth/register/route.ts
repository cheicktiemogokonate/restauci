import { getClientIp } from "@/shared/http/client-ip";
import { NextRequest }              from "next/server";
import { apiResponse }              from "@/app/api/_shared/response";
import { validateBody }             from "@/app/api/_shared/validate";
import { checkRateLimit, clientAuthLimiter } from "@/infrastructure/rate-limit";
import {
  createSessionId,
  signClientAccessToken,
  signClientRefreshToken,
} from "@/modules/auth/server";
import { createLogger }             from "@/infrastructure/logger";
import { applyClientRefreshTransport } from "@/app/api/_shared/client-session-cookie";
import { clientTokenTransportSchema } from "@/app/api/_shared/client-token-transport";
import { registerClientSchema } from "@/modules/clients/contracts";
import { ClientDomainError, registerClient } from "@/modules/clients/server";

const log = createLogger("v1-client-register");

const registerSchema = registerClientSchema.extend({
  tokenTransport: clientTokenTransportSchema,
});

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl  = await checkRateLimit(clientAuthLimiter, ip);
  if (rl) return rl;

  const { data, error } = await validateBody(req, registerSchema);
  if (error) return error;

  try {
    const client = await registerClient(data);

    const sessionId = createSessionId();
    const sessionExpiresAt = Math.floor(Date.now() / 1_000) + 7 * 24 * 3600;
    const [accessToken, refreshToken] = await Promise.all([
      signClientAccessToken({ clientId: client.id, sessionId }),
      signClientRefreshToken(
        {
          clientId: client.id,
          sessionId,
          sessionDuration: "standard",
          sessionExpiresAt,
        },
        sessionExpiresAt,
      ),
    ]);

    log.info({ clientId: client.id }, "Nouveau client inscrit");

    const response = apiResponse.created({
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
      maxAge: 7 * 24 * 3600,
    });
    return response;
  } catch (err) {
    if (err instanceof ClientDomainError && err.code === "CLIENT_ALREADY_EXISTS") {
      return apiResponse.error(err.message, "CONFLICT", { status: 409 });
    }
    log.error({ err }, "Erreur inscription client");
    return apiResponse.internalError();
  }
}
