import { env } from "@/lib/env";
import {
  isOwnerSessionRevoked,
  isTokenBlacklisted,
} from "@/lib/api/token-blacklist";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import type { JWTPayload } from "@/types";
import bcryptjs from "bcryptjs";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import {
  AUTH_COOKIE_NAME,
  LEGACY_AUTH_COOKIE_NAME,
  signWebSessionToken,
  verifyWebSessionToken,
} from "./tokens";

export * from "./tokens";

// ============================================================================
// CONSTANTS
// ============================================================================

const BCRYPT_SALT_ROUNDS = 12;

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
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

    if (!token) {
      return null;
    }

    const payload = await verifyWebSessionToken(token);
    if (!payload) return null;

    // La révocation est un contrôle de sécurité, pas un cache facultatif.
    // Une panne Redis invalide donc temporairement la session web.
    if (
      (await isTokenBlacklisted(token)) ||
      (await isOwnerSessionRevoked("user", payload.userId, payload.issuedAtMs))
    ) {
      return null;
    }

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
  } catch (error) {
    if (env.NODE_ENV !== "production") {
      console.warn(
        "[auth] Restauration de session web impossible:",
        error instanceof Error ? error.message : "Erreur inconnue",
      );
    }
    return null;
  }
}

/**
 * Définir le cookie JWT token
 */
export async function setAuthCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 8 * 60 * 60,
    path: "/",
    priority: "high",
  });
  if (AUTH_COOKIE_NAME !== LEGACY_AUTH_COOKIE_NAME) {
    cookieStore.set(LEGACY_AUTH_COOKIE_NAME, "", {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0,
      path: "/",
    });
  }
}

/**
 * Supprimer le cookie JWT token
 */
export async function clearAuthCookie(): Promise<void> {
  const cookieStore = await cookies();
  for (const name of new Set([AUTH_COOKIE_NAME, LEGACY_AUTH_COOKIE_NAME])) {
    cookieStore.set(name, "", {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0,
      path: "/",
      priority: "high",
    });
  }
}

export { signWebSessionToken };
