import { NextRequest } from "next/server";
import {
  DRIVER_REFRESH_COOKIE,
  applyDriverRefreshTransport,
  clearDriverRefreshCookie,
} from "@/app/api/_shared/driver-session-cookie";
import {
  driverRefreshRequestSchema,
  resolveDriverRefreshToken,
} from "@/app/api/_shared/driver-token-transport";
import { deliveryErrorResponse } from "@/app/api/_shared/delivery-response";
import { apiResponse } from "@/app/api/_shared/response";
import { validateBody } from "@/app/api/_shared/validate";
import { createLogger } from "@/infrastructure/logger";
import { refreshDriverSession } from "@/modules/deliveries/server";

const log = createLogger("v1-driver-refresh");

export async function POST(request: NextRequest) {
  const { data, error } = await validateBody(request, driverRefreshRequestSchema);
  if (error) return error;
  const refreshToken = resolveDriverRefreshToken({
    transport: data.tokenTransport,
    bodyToken: data.refreshToken,
    cookieToken: request.cookies.get(DRIVER_REFRESH_COOKIE)?.value,
  });
  if (!refreshToken) return apiResponse.unauthorized("Session livreur expirée");
  try {
    const tokens = await refreshDriverSession(refreshToken);
    const response = apiResponse.success({
      accessToken: tokens.accessToken,
      ...(data.tokenTransport === "json"
        ? { refreshToken: tokens.refreshToken }
        : {}),
      expiresIn: tokens.accessExpiresIn,
    });
    applyDriverRefreshTransport(response, {
      transport: data.tokenTransport,
      token: tokens.refreshToken,
      maxAge: tokens.refreshMaxAge,
    });
    return response;
  } catch (caught) {
    const response = deliveryErrorResponse(caught);
    if (response) {
      clearDriverRefreshCookie(response);
      return response;
    }
    log.error({ err: caught }, "Renouvellement livreur indisponible");
    return apiResponse.error(
      "Renouvellement temporairement indisponible",
      "SERVICE_UNAVAILABLE",
      { status: 503 },
    );
  }
}
