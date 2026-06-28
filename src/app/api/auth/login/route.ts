import { comparePassword, setAuthCookie, signToken } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { authLogger } from "@/lib/loggers";
import { authLimiter, checkRateLimit } from "@/lib/rate-limit";
import { loginSchema } from "@/lib/validations/auth";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

// ============================================================================
// HANDLER
// ============================================================================

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0] ??
    request.headers.get("x-real-ip") ??
    "anonymous";
  const rateLimitResponse = await checkRateLimit(authLimiter, ip);
  if (rateLimitResponse) return rateLimitResponse;

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

    const { email, password } = validation.data;

    // Log tentative de connexion (sans le mot de passe)
    authLogger.info({ ip, email }, "Login attempt");

    // Chercher l'utilisateur par email (exclure password)
    const user = await db
      .select({
        id: users.id,
        email: users.email,
        nom: users.nom,
        role: users.role,
        password: users.password,
      })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (user.length === 0) {
      // Email inexistant → message générique pour sécurité
      authLogger.warn({ ip, email, reason: "user not found" }, "Login failed");
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
        { ip, email, userId: user[0].id, reason: "invalid password" },
        "Login failed",
      );
      return NextResponse.json(
        { error: "Identifiants incorrects" },
        { status: 401 },
      );
    }

    // Signer le JWT token
    const token = await signToken({
      userId: user[0].id,
      email: user[0].email,
      role: user[0].role as "restaurateur" | "admin",
    });

    // Poser le cookie
    const response = NextResponse.json(
      {
        id: user[0].id,
        email: user[0].email,
        nom: user[0].nom,
        role: user[0].role,
      },
      { status: 200 },
    );

    await setAuthCookie(token);

    authLogger.info({ ip, email, userId: user[0].id }, "Login successful");
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
