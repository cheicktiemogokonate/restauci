import { getClientIp } from "@/lib/api/client-ip";
import { apiResponse } from "@/lib/api/response";
import { validateBody } from "@/lib/api/validate";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { createLogger } from "@/lib/logger";
import {
  authAccountLimiter,
  checkRateLimit,
  mobileAuthLimiter,
} from "@/lib/rate-limit";
import { securityIdentifier } from "@/lib/security/identifier";
import { emailSchema } from "@/lib/validations/auth";
import { eq } from "drizzle-orm";
import { NextRequest } from "next/server";
import { z } from "zod";
import { verifyAdminMfa } from "@/lib/auth/admin-mfa";

// Adapte ces imports selon ta lib auth existante
import {
  comparePassword,
  createSessionId,
  signPartnerAccessToken,
  signPartnerRefreshToken,
} from "@/lib/auth";

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

    // Chercher l'utilisateur
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        password: users.password,
        nom: users.nom,
        role: users.role,
        emailVerifie: users.emailVerifie,
        suspendu: users.suspendu,
      })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user) {
      // Même message pour email inconnu et mauvais mot de passe
      // (évite l'énumération d'emails)
      await comparePassword(
        password,
        "$2b$12$uTgttD2C7DC66CkZOWNP..p1.dVZb72d./VYmD08jia4VsjYPs3O2",
      );
      log.warn(
        { accountId },
        "Tentative de connexion — utilisateur inconnu",
      );
      return apiResponse.unauthorized("Email ou mot de passe incorrect");
    }

    // Vérifier le mot de passe
    const isValid = await comparePassword(password, user.password);
    if (!isValid) {
      log.warn(
        { userId: user.id },
        "Tentative de connexion — mauvais mot de passe",
      );
      return apiResponse.unauthorized("Email ou mot de passe incorrect");
    }

    // Bloquer les comptes suspendus après vérification du mot de passe
    // (pas d'énumération : le message ne fuit que si les credentials sont valides)
    if (user.suspendu) {
      log.warn({ userId: user.id }, "Tentative de connexion — compte suspendu");
      return apiResponse.forbidden("Compte suspendu. Contactez le support.");
    }

    if (user.role === "admin" && !bypassE2eSecurityProviders) {
      const mfaResult = await verifyAdminMfa(user.id, data.otp);
      if (mfaResult === "disabled") {
        log.warn(
          { userId: user.id },
          "Connexion admin sans MFA : exception de déploiement explicitement activée",
        );
      } else if (mfaResult === "not-configured") {
        return apiResponse.error(
          "L’authentification forte administrateur n’est pas configurée",
          "ADMIN_MFA_NOT_CONFIGURED",
          { status: 503 },
        );
      } else if (mfaResult === "unavailable") {
        return apiResponse.error(
          "Vérification du second facteur temporairement indisponible",
          "SERVICE_UNAVAILABLE",
          { status: 503 },
        );
      } else if (mfaResult !== "ok") {
        return apiResponse.error(
          "Code de sécurité requis ou invalide",
          "MFA_REQUIRED",
          { status: 401 },
        );
      }
    }

    // L'access token reste court. « Se souvenir de moi » étend uniquement la
    // session de renouvellement, avec une expiration absolue de 30 jours.
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
