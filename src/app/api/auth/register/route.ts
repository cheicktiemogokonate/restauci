import { hashPassword, setAuthCookie, signToken } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { authLogger } from "@/lib/loggers";
import { authLimiter, checkRateLimit } from "@/lib/rate-limit";
import { registerSchema } from "@/lib/validations/auth";
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

    const { email, password, nom, telephone, role } = validation.data;

    // Log tentative d'inscription (sans le mot de passe)
    authLogger.info({ ip, email, nom, role }, "Registration attempt");

    // Vérifier que l'email n'existe pas
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingUser.length > 0) {
      authLogger.warn(
        { ip, email, reason: "email already exists" },
        "Registration failed",
      );
      return NextResponse.json(
        { error: "Un utilisateur avec cet email existe déjà" },
        { status: 409 },
      );
    }

    // Hasher le password
    const hashedPassword = await hashPassword(password);

    // Insérer le nouvel utilisateur (exclure password de returning)
    const newUser = await db
      .insert(users)
      .values({
        email,
        password: hashedPassword,
        nom,
        telephone,
        role,
      })
      .returning({
        id: users.id,
        email: users.email,
        nom: users.nom,
        role: users.role,
        createdAt: users.createdAt,
      });

    if (!newUser[0]) {
      authLogger.error(
        { ip, email, reason: "user creation failed" },
        "Registration failed",
      );
      return NextResponse.json(
        { error: "Erreur lors de la création de l'utilisateur" },
        { status: 500 },
      );
    }

    // Signer le JWT token
    const token = await signToken({
      userId: newUser[0].id,
      email: newUser[0].email,
      role: newUser[0].role as "restaurateur" | "admin",
    });

    // Poser le cookie
    const response = NextResponse.json(
      {
        id: newUser[0].id,
        email: newUser[0].email,
        nom: newUser[0].nom,
        role: newUser[0].role,
      },
      { status: 201 },
    );

    await setAuthCookie(token);

    authLogger.info(
      { ip, email, userId: newUser[0].id },
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
