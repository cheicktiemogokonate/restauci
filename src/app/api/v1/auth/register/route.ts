import { getClientIp } from "@/shared/http/client-ip";
import { apiResponse } from "@/app/api/_shared/response";
import { validateBody } from "@/app/api/_shared/validate";
import { createLogger } from "@/infrastructure/logger";
import {
  authAccountLimiter,
  checkRateLimit,
  mobileAuthLimiter,
} from "@/infrastructure/rate-limit";
import { securityIdentifier } from "@/infrastructure/security/identifier";
import { registerSchema } from "@/modules/auth/contracts";
import {
  createSessionId,
  registerPartnerCredentials,
  signPartnerAccessToken,
  signPartnerRefreshToken,
} from "@/modules/auth/server";
import { NextRequest } from "next/server";

const log = createLogger("v1-auth-register");

export async function POST(request: NextRequest) {
  const bypassE2eSecurityProviders =
    process.env.NODE_ENV !== "production" && process.env.E2E_TEST === "true";

  // Rate limit par IP
  if (!bypassE2eSecurityProviders) {
    const ip = getClientIp(request);
    const rl = await checkRateLimit(mobileAuthLimiter, ip);
    if (rl) return rl;
  }

  // Validation du body
  const { data, error } = await validateBody(request, registerSchema);
  if (error) return error;

  const accountId = securityIdentifier("partner-email", data.email);
  if (!bypassE2eSecurityProviders) {
    const accountRateLimit = await checkRateLimit(authAccountLimiter, accountId);
    if (accountRateLimit) return accountRateLimit;
  }

  try {
    const result = await registerPartnerCredentials(data);

    if (result.alreadyRegistered) {
      log.warn({ accountId }, "Tentative d'inscription — email déjà existant");
      return apiResponse.error(
        "Un compte existe déjà avec cette adresse email.",
        "CONFLICT",
        { status: 409 },
      );
    }

    const user = result.user!;
    log.info({ userId: user.id }, "Inscription mobile réussie");

    // Auto-login : session créée immédiatement après l'inscription
    const now = Math.floor(Date.now() / 1_000);
    const sessionExpiresAt = now + 7 * 24 * 3600;
    const sessionId = createSessionId();

    const [accessToken, refreshToken] = await Promise.all([
      signPartnerAccessToken({ userId: user.id, role: user.role, sessionId }),
      signPartnerRefreshToken(
        { userId: user.id, sessionId, sessionExpiresAt },
        Math.min(now + 7 * 24 * 3600, sessionExpiresAt),
      ),
    ]);

    return apiResponse.created({
      user: {
        id: user.id,
        nom: user.nom,
        email: user.email,
        role: user.role,
      },
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: 15 * 60,
      },
    });
  } catch (err) {
    log.error({ err }, "Erreur inscription mobile.");
    return apiResponse.internalError();
  }
}
