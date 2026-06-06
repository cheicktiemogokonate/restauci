import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  comparePassword,
  signToken,
  setAuthCookie,
} from "@/lib/auth";
import { loginSchema } from "@/lib/validations/auth";

// ============================================================================
// HANDLER
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Valider le schéma
    const validation = loginSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Identifiants incorrects" },
        { status: 401 }
      );
    }

    const { email, password } = validation.data;

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
      return NextResponse.json(
        { error: "Identifiants incorrects" },
        { status: 401 }
      );
    }

    // Comparer les passwords
    const passwordValid = await comparePassword(password, user[0].password);

    if (!passwordValid) {
      // Password faux → message générique pour sécurité
      return NextResponse.json(
        { error: "Identifiants incorrects" },
        { status: 401 }
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
      { status: 200 }
    );

    await setAuthCookie(token);

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Une erreur interne est survenue" },
      { status: 500 }
    );
  }
}
