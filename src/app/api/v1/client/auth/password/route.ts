import { getClientSession } from "@/app/api/_shared/auth-client";
import { apiResponse } from "@/app/api/_shared/response";
import { validateBody } from "@/app/api/_shared/validate";
import { createLogger } from "@/infrastructure/logger";
import { checkRateLimit, clientApiLimiter } from "@/infrastructure/rate-limit";
import { NextRequest } from "next/server";
import { changeClientPasswordSchema } from "@/modules/clients/contracts";
import {
  changeClientPassword,
  ClientDomainError,
} from "@/modules/clients/server";

const log = createLogger("v1-client-auth-password");

// POST /api/v1/client/auth/password
export async function POST(req: NextRequest) {
  const { session, error } = await getClientSession(req);
  if (error) return error;

  const rl = await checkRateLimit(clientApiLimiter, session.clientId);
  if (rl) return rl;

  const { data, error: vError } = await validateBody(
    req,
    changeClientPasswordSchema,
  );
  if (vError) return vError;

  try {
    await changeClientPassword(session.clientId, data);

    return apiResponse.success({ message: "Mot de passe modifié" });
  } catch (err) {
    if (err instanceof ClientDomainError) {
      if (err.code === "CLIENT_CURRENT_PASSWORD_INVALID") {
        return apiResponse.error(err.message, "VALIDATION_ERROR", { status: 422 });
      }
      if (err.code === "CLIENT_NOT_FOUND") {
        return apiResponse.notFound("Client");
      }
    }
    log.error(
      { err, clientId: session.clientId },
      "Erreur changement de mot de passe client",
    );
    return apiResponse.internalError();
  }
}
