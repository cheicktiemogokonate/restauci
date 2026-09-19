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
    let clientId: string;
    let sessionId: string;
    let issuedAtMs: number;

    const payload = await verifyClientAccessToken(token);
    if (payload) {
      clientId = payload.clientId;
      sessionId = payload.sessionId;
      issuedAtMs = payload.issuedAtMs;
    } else {
      // Fallback pour les tokens d'authentification porteurs du rôle 'client'
      const { jwtVerify } = await import("jose");
      const { env } = await import("@/infrastructure/env");
      const secret = new TextEncoder().encode(env.JWT_SECRET);
      const { payload: generalPayload } = await jwtVerify(token, secret, {
        algorithms: ["HS256"],
      });
      const candidateId = (generalPayload.clientId ?? generalPayload.userId ?? generalPayload.sub);
      const isClientRole = generalPayload.role === "client" || generalPayload.type === "client-access" || generalPayload.type === "client";
      if (!isClientRole || typeof candidateId !== "string" || !candidateId) {
        return {
          session: null,
          error: apiResponse.unauthorized("Token client invalide"),
        };
      }
      clientId = candidateId;
      sessionId = typeof generalPayload.sessionId === "string" ? generalPayload.sessionId : (typeof generalPayload.jti === "string" ? generalPayload.jti : "");
      issuedAtMs = typeof generalPayload.issuedAtMs === "number" ? generalPayload.issuedAtMs : (typeof generalPayload.iat === "number" ? generalPayload.iat * 1000 : Date.now());
    }

    try {
      if (
        (sessionId ? await isSessionRevoked(sessionId) : false) ||
        (await isOwnerSessionRevoked(
          "client",
          clientId,
          issuedAtMs,
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

    const client = await getClientSessionState(clientId);
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
