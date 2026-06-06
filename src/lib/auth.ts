import { jwtVerify, SignJWT } from "jose";
import bcryptjs from "bcryptjs";
import { cookies } from "next/headers";
import type { JWTPayload } from "@/types";
import { env } from "@/lib/env";

type JWTPayloadToken = JWTPayload & Record<string, unknown>;

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
 * Créer et signer un JWT token avec payload utilisateur
 */
export async function signToken(payload: JWTPayloadToken): Promise<string> {
  return new SignJWT(payload as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(JWT_EXPIRATION)
    .sign(JWT_SECRET);
}

/**
 * Vérifier et décoder un JWT token
 * Retourne le payload ou null en cas d'erreur
 */
export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const verified = await jwtVerify(token, JWT_SECRET);
    return verified.payload as unknown as JWTPayload;
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
  hash: string
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

    return await verifyToken(token);
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
    secure: process.env.NODE_ENV === "production",
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
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
}
