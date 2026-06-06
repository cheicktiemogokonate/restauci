import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  hashPassword,
  signToken,
  setAuthCookie,
} from "@/lib/auth";
import { registerSchema } from "@/lib/validations/auth";

// ============================================================================
// HANDLER
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Valider le schéma
    const validation = registerSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Données invalides",
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { email, password, nom, telephone, role } = validation.data;

    // Vérifier que l'email n'existe pas
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingUser.length > 0) {
      return NextResponse.json(
        { error: "Un utilisateur avec cet email existe déjà" },
        { status: 409 }
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
      return NextResponse.json(
        { error: "Erreur lors de la création de l'utilisateur" },
        { status: 500 }
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
      { status: 201 }
    );

    await setAuthCookie(token);

    return response;
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json(
      { error: "Une erreur interne est survenue" },
      { status: 500 }
    );
  }
}
