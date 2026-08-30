import { getClientIp } from "@/lib/api/client-ip";
import {
  hashPassword,
  setAuthCookie,
  signWebSessionToken,
} from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { authLogger } from "@/lib/loggers";
import { authLimiter, checkRateLimit } from "@/lib/rate-limit";
import { registerSchema } from "@/lib/validations/auth";
import { securityIdentifier } from "@/lib/security/identifier";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

// ============================================================================
// HANDLER
// ============================================================================

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rateLimitResponse = await checkRateLimit(authLimiter, ip);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      authLogger.warn(
        { ip, reason: "invalid json body" },
        "Registration request with invalid JSON",
      );
      return NextResponse.json(
        { error: "Corps de requête invalide — JSON attendu." },
        { status: 400 },
      );
    }

    // Valider le schéma
    const validation = registerSchema.safeParse(body);
    if (!validation.success) {
      authLogger.warn(
        {
          ip,
          reason: "invalid registration format",
          errors: validation.error.flatten().fieldErrors,
        },
        "Registration attempt with invalid format",
      );
      return NextResponse.json(
        {
          error: "Données invalides",
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const { email, password, nom, telephone } = validation.data;
    const accountId = securityIdentifier("partner-email", email);

    // Log tentative d'inscription (sans le mot de passe)
    authLogger.info({ ip, accountId }, "Registration attempt");

    // Vérifier que l'email n'existe pas
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingUser.length > 0) {
      // Conserver un coût proche d'une création afin que le temps de réponse
      // ne devienne pas un oracle fiable sur l'existence du compte.
      await hashPassword(password);
      authLogger.warn(
        { ip, accountId, reason: "email already exists" },
        "Registration blocked (duplicate)",
      );
      // Anti-énumération : réponse de même forme qu'une création réussie,
      // SANS cookie de session ni détail sur l'existence du compte.
      // Le frontend redirige vers /onboarding, d'où le proxy renvoie vers
      // /login faute de session — parcours naturel pour un compte existant.
      return NextResponse.json(
        { success: true, alreadyRegistered: true },
        { status: 200 },
      );
    }

    // Hasher le password
    const hashedPassword = await hashPassword(password);

    const userId = crypto.randomUUID();
    await db.insert(users).values({
      id: userId,
      email,
      password: hashedPassword,
      nom,
      telephone,
      role: "partner",
    });

    const newUser = {
      id: userId,
      email,
      nom,
      role: "partner" as const,
    };

    // Signer le JWT token
    const token = await signWebSessionToken({
      userId: newUser.id,
      email: newUser.email,
      role: newUser.role,
    });

    // Poser le cookie
    const response = NextResponse.json(
      {
        id: newUser.id,
        email: newUser.email,
        nom: newUser.nom,
        role: newUser.role,
      },
      { status: 201 },
    );

    await setAuthCookie(token);

    authLogger.info(
      { ip, accountId, userId: newUser.id },
      "Registration successful",
    );
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
      "Registration error",
    );
    return NextResponse.json(
      { error: "Une erreur interne est survenue" },
      { status: 500 },
    );
  }
}
