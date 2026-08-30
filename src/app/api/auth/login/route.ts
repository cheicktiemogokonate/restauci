import { getClientIp } from "@/lib/api/client-ip";
import {
  comparePassword,
  setAuthCookie,
  signWebSessionToken,
} from "@/lib/auth";
import { db } from "@/lib/db";
import { partnerAccounts, users } from "@/lib/db/schema";
import { authLogger } from "@/lib/loggers";
import {
  authAccountLimiter,
  authLimiter,
  checkRateLimit,
} from "@/lib/rate-limit";
import { securityIdentifier } from "@/lib/security/identifier";
import { loginSchema } from "@/lib/validations/auth";
import { verifyAdminMfa } from "@/lib/auth/admin-mfa";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

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

    // Chercher l'utilisateur par email (exclure password)
    const user = await db
      .select({
        id: users.id,
        email: users.email,
        nom: users.nom,
        role: users.role,
        password: users.password,
        suspendu: users.suspendu,
      })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (user.length === 0) {
      // Email inexistant → message générique pour sécurité
      await comparePassword(
        password,
        "$2b$12$uTgttD2C7DC66CkZOWNP..p1.dVZb72d./VYmD08jia4VsjYPs3O2",
      );
      authLogger.warn(
        { ip, accountId, reason: "user not found" },
        "Login failed",
      );
      return NextResponse.json(
        { error: "Identifiants incorrects" },
        { status: 401 },
      );
    }

    // Comparer les passwords
    const passwordValid = await comparePassword(password, user[0].password);

    if (!passwordValid) {
      // Password faux → message générique pour sécurité
      authLogger.warn(
        { ip, accountId, userId: user[0].id, reason: "invalid password" },
        "Login failed",
      );
      return NextResponse.json(
        { error: "Identifiants incorrects" },
        { status: 401 },
      );
    }

    if (user[0].suspendu) {
      authLogger.warn(
        { ip, accountId, userId: user[0].id, reason: "suspended account" },
        "Login denied for suspended user",
      );
      return NextResponse.json(
        { error: "Votre compte a été suspendu. Contactez le support." },
        { status: 403 },
      );
    }

    if (user[0].role === "admin" && !bypassRateLimit) {
      const mfaResult = await verifyAdminMfa(user[0].id, otp);
      if (mfaResult === "disabled") {
        authLogger.warn(
          { userId: user[0].id },
          "Connexion admin sans MFA : exception de déploiement explicitement activée",
        );
      } else if (mfaResult === "not-configured") {
        authLogger.error(
          { userId: user[0].id },
          "Connexion admin bloquée : TOTP non configuré",
        );
        return NextResponse.json(
          {
            error: "L’authentification forte administrateur n’est pas configurée.",
            code: "ADMIN_MFA_NOT_CONFIGURED",
          },
          { status: 503 },
        );
      } else if (mfaResult === "unavailable") {
        return NextResponse.json(
          {
            error: "Vérification du second facteur temporairement indisponible.",
            code: "SERVICE_UNAVAILABLE",
          },
          { status: 503 },
        );
      } else if (mfaResult !== "ok") {
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
    const token = await signWebSessionToken({
      userId: user[0].id,
      email: user[0].email,
      role: user[0].role,
    });

    const partnerAccount = user[0].role === "partner"
      ? await db.query.partnerAccounts.findFirst({
          where: eq(partnerAccounts.userId, user[0].id),
          columns: { id: true },
        })
      : null;

    // Poser le cookie
    const response = NextResponse.json(
      {
        id: user[0].id,
        email: user[0].email,
        nom: user[0].nom,
        role: user[0].role,
        hasPartnerAccount: Boolean(partnerAccount),
      },
      { status: 200 },
    );

    await setAuthCookie(token);

    authLogger.info({ ip, accountId, userId: user[0].id }, "Login successful");
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
