import { getClientSession } from "@/app/api/_shared/auth-client";
import { apiResponse } from "@/app/api/_shared/response";
import { validateBody } from "@/app/api/_shared/validate";
import { createLogger } from "@/infrastructure/logger";
import { checkRateLimit, clientApiLimiter } from "@/infrastructure/rate-limit";
import { NextRequest } from "next/server";
import { updateClientProfileSchema } from "@/modules/clients/contracts";
import {
  ClientDomainError,
  getClientProfile,
  updateClientProfile,
} from "@/modules/clients/server";

const log = createLogger("v1-client-auth-me");

// GET /api/v1/client/auth/me
export async function GET(req: NextRequest) {
  const { session, error } = await getClientSession(req);
  if (error) return error;

  try {
    const client = await getClientProfile(session.clientId);

    if (!client) return apiResponse.notFound("Client");

    return apiResponse.success(client);
  } catch (err) {
    log.error(
      { err, clientId: session.clientId },
      "Erreur lecture profil client",
    );
    return apiResponse.internalError();
  }
}

// PATCH /api/v1/client/auth/me
export async function PATCH(req: NextRequest) {
  const { session, error } = await getClientSession(req);
  if (error) return error;

  const rl = await checkRateLimit(clientApiLimiter, session.clientId);
  if (rl) return rl;

  const { data, error: vError } = await validateBody(
    req,
    updateClientProfileSchema,
  );
  if (vError) return vError;

  try {
    await updateClientProfile(session.clientId, data);

    return apiResponse.success({ message: "Profil mis à jour" });
  } catch (err) {
    if (err instanceof ClientDomainError) {
      if (err.code === "CLIENT_CURRENT_PASSWORD_INVALID") {
        return apiResponse.error(err.message, "VALIDATION_ERROR", { status: 422 });
      }
      if (err.code === "CLIENT_NOT_FOUND") {
        return apiResponse.error(err.message, "BAD_REQUEST", { status: 400 });
      }
    }
    log.error(
      { err, clientId: session.clientId },
      "Erreur mise à jour profil client",
    );
    return apiResponse.internalError();
  }
}
