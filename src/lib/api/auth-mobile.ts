import { redis } from "@/lib/cache/redis";
import { db } from "@/lib/db";
import { restaurants, users } from "@/lib/db/schema";
import { createLogger } from "@/lib/logger";
import { eq } from "drizzle-orm";
import { NextRequest } from "next/server";
import { apiResponse } from "./response";

// Utilise la même librairie JWT que le reste de l'app
// Adapte l'import selon ce que tu trouves dans src/lib/auth/index.ts
import { verifyToken } from "@/lib/auth";

const log = createLogger("api-mobile-auth");

export interface MobileSession {
  userId: string;
  role: "restaurateur" | "admin";
  restaurantId: string | null;
}

/**
 * Vérifie le token Bearer depuis le header Authorization.
 * Retourne la session ou une réponse d'erreur.
 *
 * Usage dans une route :
 * const { session, error } = await getMobileSession(req);
 * if (error) return error;
 * // session est typé et garanti non-null ici
 */
export async function getMobileSession(
  req: NextRequest,
): Promise<
  { session: MobileSession; error: null } | { session: null; error: Response }
> {
  const authHeader = req.headers.get("authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return {
      session: null,
      error: apiResponse.unauthorized(
        "Token Bearer manquant. Format : Authorization: Bearer <token>",
      ),
    };
  }

  const token = authHeader.slice(7); // Retire "Bearer "

  // Vérifier si le token est blacklisté (pour le logout)
  const isBlacklisted = await redis.get(`restauci:blacklist:${token}`);
  if (isBlacklisted) {
    return {
      session: null,
      error: apiResponse.unauthorized("Token révoqué. Reconnectez-vous."),
    };
  }

  try {
    // Utilise la même fonction de vérification JWT que l'app web
    // Adapte selon ce que tu trouves dans src/lib/auth/index.ts
    const payload = await verifyToken(token);

    if (!payload?.userId) {
      return {
        session: null,
        error: apiResponse.unauthorized("Token invalide"),
      };
    }

    const [user] = await db
      .select({ id: users.id, role: users.role, suspendu: users.suspendu })
      .from(users)
      .where(eq(users.id, payload.userId as string))
      .limit(1);

    if (!user || user.suspendu) {
      return {
        session: null,
        error: apiResponse.forbidden("Compte suspendu ou introuvable"),
      };
    }

    // Récupérer le restaurantId associé au rôle actuel en base.
    let restaurantId: string | null = null;
    if (user.role === "restaurateur") {
      const [restaurant] = await db
        .select({ id: restaurants.id })
        .from(restaurants)
        .where(eq(restaurants.userId, payload.userId as string))
        .limit(1);
      restaurantId = restaurant?.id ?? null;
    }

    return {
      session: {
        userId: user.id,
        role: user.role,
        restaurantId,
      },
      error: null,
    };
  } catch (err) {
    log.warn(
      { err: err instanceof Error ? err.message : "unknown" },
      "Token mobile invalide",
    );
    return {
      session: null,
      error: apiResponse.unauthorized("Token expiré ou invalide"),
    };
  }
}

/**
 * Garde : vérifie session ET que le user est restaurateur avec un restaurant.
 */
export async function requireRestaurateurSession(
  req: NextRequest,
): Promise<
  | { session: MobileSession & { restaurantId: string }; error: null }
  | { session: null; error: Response }
> {
  const { session, error } = await getMobileSession(req);
  if (error) return { session: null, error };

  if (session.role !== "restaurateur") {
    return {
      session: null,
      error: apiResponse.forbidden("Accès réservé aux restaurateurs"),
    };
  }

  if (!session.restaurantId) {
    return {
      session: null,
      error: apiResponse.notFound("Restaurant"),
    };
  }

  return {
    session: { ...session, restaurantId: session.restaurantId },
    error: null,
  };
}
