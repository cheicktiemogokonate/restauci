import { env } from "@/lib/env";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import type { JWTPayload } from "@/types";
import bcryptjs from "bcryptjs";
import { eq } from "drizzle-orm";
import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";

// ============================================================================
// CONSTANTS
// ============================================================================

const JWT_SECRET = new TextEncoder().encode(env.JWT_SECRET);
const JWT_EXPIRATION = "7d";
const BCRYPT_SALT_ROUNDS = 12;

// ============================================================================
// JWT HELPERS
// ============================================================================

/**
 * Créer et signer un JWT token avec un payload arbitraire.
 * @param payload - Les données à inclure dans le token
 * @param expiresIn - Durée de validité (ex: "24h", "7d", "30d"). Défaut: "7d"
 */
export async function signToken(
  payload: Record<string, unknown>,
  expiresIn = JWT_EXPIRATION,
): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(expiresIn)
    .sign(JWT_SECRET);
}

/**
 * Vérifier et décoder un JWT token.
 * Retourne le payload sous forme de Record ou null en cas d'erreur.
 * Compatible avec les tokens utilisateur ET client.
 */
export async function verifyToken(
  token: string,
): Promise<Record<string, unknown> | null> {
  try {
    const verified = await jwtVerify(token, JWT_SECRET);
    return verified.payload as unknown as Record<string, unknown>;
  } catch {
    return null;
  }
}

// ============================================================================
// PASSWORD HELPERS
// ============================================================================

/**
 * Hasher un password avec bcryptjs
 */
export async function hashPassword(password: string): Promise<string> {
  return bcryptjs.hash(password, BCRYPT_SALT_ROUNDS);
}

/**
 * Comparer un password avec son hash
 */
export async function comparePassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcryptjs.compare(password, hash);
}

// ============================================================================
// COOKIE HELPERS
// ============================================================================

/**
 * Récupérer l'utilisateur actuel depuis le cookie JWT
 */
export async function getCurrentUser(): Promise<JWTPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if (!token) {
      return null;
    }

    const payload = await verifyToken(token);
    if (!payload || typeof payload.userId !== "string") return null;

    // Le JWT ne fait qu'identifier la session : le rôle et l'état du compte
    // doivent toujours provenir de la base pour qu'une suspension ou une
    // rétrogradation prennent effet immédiatement.
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        role: users.role,
        suspendu: users.suspendu,
      })
      .from(users)
      .where(eq(users.id, payload.userId))
      .limit(1);

    if (!user || user.suspendu) return null;

    return {
      userId: user.id,
      email: user.email,
      role: user.role,
    };
  } catch {
    return null;
  }
}

/**
 * Définir le cookie JWT token
 */
export async function setAuthCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set("token", token, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
    path: "/",
  });
}

/**
 * Supprimer le cookie JWT token
 */
export async function clearAuthCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set("token", "", {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
}
