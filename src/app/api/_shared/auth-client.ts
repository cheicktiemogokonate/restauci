import { NextRequest }  from "next/server";
import { apiResponse }  from "./response";
import { verifyClientAccessToken } from "@/modules/auth/server";
import { createLogger } from "@/infrastructure/logger";
import { getClientSessionState } from "@/modules/clients/server";
import {
  isSessionRevoked,
  isOwnerSessionRevoked,
  isTokenBlacklisted,
} from "@/infrastructure/auth/revocation";

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

  // Vérifier le blacklist (logout / rotation)
  try {
    if (await isTokenBlacklisted(token)) {
      return {
        session: null,
        error:   apiResponse.unauthorized("Session expirée. Reconnectez-vous."),
      };
    }
  } catch {
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
    const payload = await verifyClientAccessToken(token);

    if (!payload) {
      return {
        session: null,
        error:   apiResponse.unauthorized("Token client invalide"),
      };
    }


    try {
      if (
        (await isSessionRevoked(payload.sessionId)) ||
        (await isOwnerSessionRevoked(
          "client",
          payload.clientId,
          payload.issuedAtMs,
        ))
      ) {
        return {
          session: null,
          error: apiResponse.unauthorized("Session révoquée. Reconnectez-vous."),
        };
      }
    } catch {
      return {
        session: null,
        error: apiResponse.error(
          "Vérification de session temporairement indisponible",
          "SERVICE_UNAVAILABLE",
          { status: 503 },
        ),
      };
    }

    const client = await getClientSessionState(payload.clientId as string);
    if (!client?.active) {
      return {
        session: null,
        error: apiResponse.forbidden("Compte client désactivé"),
      };
    }

    return {
      session: { clientId: client.id, type: "client" },
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
