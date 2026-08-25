import { isTokenBlacklisted } from "@/lib/api/token-blacklist";
import { db } from "@/lib/db";
import { partnerAccounts, restaurants, users } from "@/lib/db/schema";
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
  role: "partner" | "admin";
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

  // Vérifier si le token est blacklisté (logout / rotation du refresh).
  // Si Redis est indisponible on dégrade gracieusement (cohérent avec
  // getClientSession) : la suspension reste vérifiée en base plus bas.
  try {
    if (await isTokenBlacklisted(token)) {
      return {
        session: null,
        error: apiResponse.unauthorized("Token révoqué. Reconnectez-vous."),
      };
    }
  } catch (err) {
    log.warn(
      { err: err instanceof Error ? err.message : "unknown" },
      "Blacklist indisponible lors de la vérification de session mobile",
    );
  }

  try {
    // Utilise la même fonction de vérification JWT que l'app web
    const payload = await verifyToken(token);

    // Un access token explicite est exigé : un refresh token (longue durée)
    // ne doit jamais être utilisable directement comme Bearer.
    if (!payload?.userId || payload.type !== "access") {
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
    if (user.role === "partner") {
      const [restaurant] = await db
        .select({ id: restaurants.id })
        .from(partnerAccounts)
        .innerJoin(
          restaurants,
          eq(restaurants.partnerAccountId, partnerAccounts.id),
        )
        .where(eq(partnerAccounts.userId, payload.userId as string))
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

  if (session.role !== "partner") {
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
