import {
  isSessionRevoked,
  isOwnerSessionRevoked,
  isTokenBlacklisted,
} from "@/infrastructure/auth/revocation";
import { createLogger } from "@/infrastructure/logger";
import { NextRequest } from "next/server";
import { apiResponse } from "./response";

import {
  getActivePartnerUserIdentity,
  verifyPartnerAccessToken,
} from "@/modules/auth/server";
import { getPartnerAccountByUserId } from "@/modules/partners/server";
import { getRestaurantByPartnerAccountId } from "@/modules/restaurants/server";

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

  // La révocation est un contrôle de sécurité : en cas de panne Redis, les
  // routes authentifiées échouent fermées au lieu de réaccepter un jeton volé.
  try {
    if (await isTokenBlacklisted(token)) {
      return {
        session: null,
        error: apiResponse.unauthorized("Token révoqué. Reconnectez-vous."),
      };
    }
  } catch (err) {
    log.error(
      { err: err instanceof Error ? err.message : "unknown" },
      "Blacklist indisponible lors de la vérification de session mobile",
    );
    return {
      session: null,
      error: apiResponse.error(
        "Vérification de session temporairement indisponible",
        "SERVICE_UNAVAILABLE",
        { status: 503 },
      ),
    };
  }

  try {
    const payload = await verifyPartnerAccessToken(token);

    // Un access token explicite est exigé : un refresh token (longue durée)
    // ne doit jamais être utilisable directement comme Bearer.
    if (!payload) {
      return {
        session: null,
        error: apiResponse.unauthorized("Token invalide"),
      };
    }

    try {
      if (
        (await isSessionRevoked(payload.sessionId)) ||
        (await isOwnerSessionRevoked(
          "user",
          payload.userId,
          payload.issuedAtMs,
        ))
      ) {
        return {
          session: null,
          error: apiResponse.unauthorized("Session révoquée. Reconnectez-vous."),
        };
      }
    } catch (err) {
      log.error(
        { err: err instanceof Error ? err.message : "unknown" },
        "Registre des sessions indisponible",
      );
      return {
        session: null,
        error: apiResponse.error(
          "Vérification de session temporairement indisponible",
          "SERVICE_UNAVAILABLE",
          { status: 503 },
        ),
      };
    }

    const user = await getActivePartnerUserIdentity(payload.userId);

    if (!user) {
      return {
        session: null,
        error: apiResponse.forbidden("Compte suspendu ou introuvable"),
      };
    }

    // Récupérer le restaurantId associé au rôle actuel en base.
    let restaurantId: string | null = null;
    if (user.role === "partner") {
      const account = await getPartnerAccountByUserId(payload.userId as string);
      const restaurant = account
        ? await getRestaurantByPartnerAccountId(account.id)
        : null;
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
