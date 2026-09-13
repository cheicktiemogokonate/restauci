import { getClientIp } from "@/shared/http/client-ip";
import {
  authenticatePartnerCredentials,
  setAuthCookie,
  signWebSessionToken,
} from "@/modules/auth/server";
import { authLogger } from "@/infrastructure/loggers";
import {
  authAccountLimiter,
  authLimiter,
  checkRateLimit,
} from "@/infrastructure/rate-limit";
import { securityIdentifier } from "@/infrastructure/security/identifier";
import { loginSchema } from "@/modules/auth/contracts";
import { NextRequest, NextResponse } from "next/server";
import { getPartnerAccountByUserId } from "@/modules/partners/server";

// ============================================================================
// HANDLER
// ============================================================================

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const bypassRateLimit =
    process.env.NODE_ENV !== "production" && process.env.E2E_TEST === "true";
  // Bypass réservé aux tests e2e : il est doublement conditionné (NODE_ENV
  // ET E2E_TEST) pour qu'une fuite de E2E_TEST=true en production soit
  // sans effet sur la surface d'attaque du login.
  if (bypassRateLimit) {
    // rate limiting désactivé en environnement de test e2e uniquement
  } else {
    const rateLimitResponse = await checkRateLimit(authLimiter, ip);
    if (rateLimitResponse) return rateLimitResponse;
  }

  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      authLogger.warn(
        { ip, reason: "invalid json body" },
        "Login request with invalid JSON",
      );
      return NextResponse.json(
        { error: "Corps de requête invalide — JSON attendu." },
        { status: 400 },
      );
    }

    // Valider le schéma
    const validation = loginSchema.safeParse(body);
    if (!validation.success) {
      authLogger.warn(
        { ip, reason: "invalid login format" },
        "Login attempt with invalid format",
      );
      return NextResponse.json(
        { error: "Identifiants incorrects" },
        { status: 401 },
      );
    }

    const { email, password, otp } = validation.data;
    const accountId = securityIdentifier("partner-email", email);

    if (!bypassRateLimit) {
      const accountRateLimit = await checkRateLimit(
        authAccountLimiter,
        accountId,
      );
      if (accountRateLimit) return accountRateLimit;
    }

    // Log tentative de connexion (sans le mot de passe)
    authLogger.info({ ip, accountId }, "Login attempt");

    const authentication = await authenticatePartnerCredentials(
      { email, password, otp },
      { enforceAdminMfa: !bypassRateLimit },
    );
    if (authentication.status === "invalid_credentials") {
      authLogger.warn(
        { ip, accountId, reason: "invalid credentials" },
        "Login failed",
      );
      return NextResponse.json(
        { error: "Identifiants incorrects" },
        { status: 401 },
      );
    }

    if (authentication.status === "suspended") {
      authLogger.warn(
        { ip, accountId, userId: authentication.userId, reason: "suspended account" },
        "Login denied for suspended user",
      );
      return NextResponse.json(
        { error: "Votre compte a été suspendu. Contactez le support." },
        { status: 403 },
      );
    }

    if (authentication.status !== "authenticated") {
      if (authentication.status === "mfa_not_configured") {
        authLogger.error(
          { userId: authentication.userId },
          "Connexion admin bloquée : TOTP non configuré",
        );
        return NextResponse.json(
          {
            error: "L’authentification forte administrateur n’est pas configurée.",
            code: "ADMIN_MFA_NOT_CONFIGURED",
          },
          { status: 503 },
        );
      } else if (authentication.status === "mfa_unavailable") {
        return NextResponse.json(
          {
            error: "Vérification du second facteur temporairement indisponible.",
            code: "SERVICE_UNAVAILABLE",
          },
          { status: 503 },
        );
      } else {
        return NextResponse.json(
          {
            error: "Code de sécurité requis ou invalide.",
            code: "MFA_REQUIRED",
          },
          { status: 401 },
        );
      }
    }

    // Signer le JWT token
    const user = authentication.user;
    const token = await signWebSessionToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    const partnerAccount = user.role === "partner"
      ? await getPartnerAccountByUserId(user.id)
      : null;

    // Poser le cookie
    const response = NextResponse.json(
      {
        id: user.id,
        email: user.email,
        nom: user.nom,
        role: user.role,
        hasPartnerAccount: Boolean(partnerAccount),
      },
      { status: 200 },
    );

    await setAuthCookie(token);

    authLogger.info({ ip, accountId, userId: user.id }, "Login successful");
    return response;
  } catch (error) {
    authLogger.error(
      {
        ip,
        error: error instanceof Error ? error.message : "Unknown error",
        stack:
          process.env.NODE_ENV === "development" && error instanceof Error
            ? error.stack
            : undefined,
      },
      "Login error",
    );
    return NextResponse.json(
      { error: "Une erreur interne est survenue" },
      { status: 500 },
    );
  }
}
