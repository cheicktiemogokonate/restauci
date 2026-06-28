import { NextRequest }  from "next/server";
import { apiResponse }  from "./response";
import { verifyToken }  from "@/lib/auth";  // adapte selon ton fichier auth
import { redis }        from "@/lib/cache/redis";
import { createLogger } from "@/lib/logger";

const log = createLogger("api-client-auth");

export interface ClientSession {
  clientId: string;
  type:     "client";
}

/**
 * Vérifie le token Bearer d'un client mobile.
 * Même pattern que getMobileSession mais pour les clients.
 */
export async function getClientSession(req: NextRequest): Promise<
  | { session: ClientSession; error: null }
  | { session: null; error: Response }
> {
  const authHeader = req.headers.get("authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return {
      session: null,
      error:   apiResponse.unauthorized("Token Bearer manquant"),
    };
  }

  const token = authHeader.slice(7);

  // Vérifier le blacklist (logout)
  try {
    const isBlacklisted = await redis.get(`restauci:blacklist:${token}`);
    if (isBlacklisted) {
      return {
        session: null,
        error:   apiResponse.unauthorized("Session expirée. Reconnectez-vous."),
      };
    }
  } catch {
    // Si Redis down → continuer sans vérif blacklist
  }

  try {
    const payload = await verifyToken(token);

    if (!payload?.clientId || payload.type !== "client") {
      return {
        session: null,
        error:   apiResponse.unauthorized("Token client invalide"),
      };
    }

    return {
      session: { clientId: payload.clientId as string, type: "client" },
      error:   null,
    };
  } catch {
    log.warn("Token client invalide ou expiré");
    return {
      session: null,
      error:   apiResponse.unauthorized("Token expiré. Reconnectez-vous."),
    };
  }
}