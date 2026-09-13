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
import { emailSchema } from "@/modules/auth/contracts";
import { NextRequest } from "next/server";
import { z } from "zod";

// Adapte ces imports selon ta lib auth existante
import {
  authenticatePartnerCredentials,
  createSessionId,
  signPartnerAccessToken,
  signPartnerRefreshToken,
} from "@/modules/auth/server";

const log = createLogger("v1-auth-login");

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128),
  rememberMe: z.boolean().default(false),
  // Optionnel : identifiant de l'appareil pour les notifications push
  deviceToken: z.string().optional(),
  otp: z.string().regex(/^\d{6}$/).optional(),
});

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
  const { data, error } = await validateBody(request, loginSchema);
  if (error) return error;

  const accountId = securityIdentifier("partner-email", data.email);
  if (!bypassE2eSecurityProviders) {
    const accountRateLimit = await checkRateLimit(authAccountLimiter, accountId);
    if (accountRateLimit) return accountRateLimit;
  }

  try {
    const { email, password, rememberMe } = data;

    const authentication = await authenticatePartnerCredentials(
      { email, password, otp: data.otp },
      { enforceAdminMfa: !bypassE2eSecurityProviders },
    );
    if (authentication.status === "invalid_credentials") {
      log.warn(
        { accountId },
        "Tentative de connexion — utilisateur inconnu",
      );
      return apiResponse.unauthorized("Email ou mot de passe incorrect");
    }

    if (authentication.status === "suspended") {
      log.warn({ userId: authentication.userId }, "Tentative de connexion — compte suspendu");
      return apiResponse.forbidden("Compte suspendu. Contactez le support.");
    }

    if (authentication.status !== "authenticated") {
      if (authentication.status === "mfa_not_configured") {
        return apiResponse.error(
          "L’authentification forte administrateur n’est pas configurée",
          "ADMIN_MFA_NOT_CONFIGURED",
          { status: 503 },
        );
      } else if (authentication.status === "mfa_unavailable") {
        return apiResponse.error(
          "Vérification du second facteur temporairement indisponible",
          "SERVICE_UNAVAILABLE",
          { status: 503 },
        );
      } else {
        return apiResponse.error(
          "Code de sécurité requis ou invalide",
          "MFA_REQUIRED",
          { status: 401 },
        );
      }
    }

    // L'access token reste court. « Se souvenir de moi » étend uniquement la
    // session de renouvellement, avec une expiration absolue de 30 jours.
    const user = authentication.user;
    const now = Math.floor(Date.now() / 1_000);
    const sessionExpiresAt =
      now + (rememberMe ? 30 * 24 * 3600 : 7 * 24 * 3600);
    const sessionId = createSessionId();

    const [accessToken, refreshToken] = await Promise.all([
      signPartnerAccessToken({ userId: user.id, role: user.role, sessionId }),
      signPartnerRefreshToken(
        { userId: user.id, sessionId, sessionExpiresAt },
        Math.min(now + 7 * 24 * 3600, sessionExpiresAt),
      ),
    ]);

    log.info({ userId: user.id }, "Connexion mobile réussie");

    return apiResponse.success({
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
    log.error({ err }, "Erreur login mobile");
    return apiResponse.internalError();
  }
}
