import { NextRequest } from "next/server";
import { createLogger } from "@/infrastructure/logger";
import {
  resolveDriverSession,
  type DriverSession,
} from "@/modules/deliveries/server";
import { deliveryErrorResponse } from "./delivery-response";
import { apiResponse } from "./response";

const log = createLogger("api-driver-auth");

export async function requireDriverSession(
  request: NextRequest,
): Promise<
  | { session: DriverSession; accessToken: string; error: null }
  | { session: null; accessToken: null; error: Response }
> {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) {
    return {
      session: null,
      accessToken: null,
      error: apiResponse.unauthorized("Token Bearer livreur manquant"),
    };
  }
  const accessToken = header.slice(7);
  try {
    return {
      session: await resolveDriverSession(accessToken),
      accessToken,
      error: null,
    };
  } catch (error) {
    const response = deliveryErrorResponse(error);
    if (response) {
      return { session: null, accessToken: null, error: response };
    }
    log.error({ err: error }, "Vérification de session livreur indisponible");
    return {
      session: null,
      accessToken: null,
      error: apiResponse.error(
        "Vérification de session temporairement indisponible",
        "SERVICE_UNAVAILABLE",
        { status: 503 },
      ),
    };
  }
}
