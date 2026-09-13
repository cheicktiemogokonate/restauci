import { NextRequest } from "next/server";
import {
  DRIVER_REFRESH_COOKIE,
  clearDriverRefreshCookie,
} from "@/app/api/_shared/driver-session-cookie";
import {
  readOptionalDriverLogoutBody,
  resolveDriverRefreshToken,
} from "@/app/api/_shared/driver-token-transport";
import { apiResponse } from "@/app/api/_shared/response";
import { createLogger } from "@/infrastructure/logger";
import { revokeDriverSession } from "@/modules/deliveries/server";

const log = createLogger("v1-driver-logout");

export async function POST(request: NextRequest) {
  const body = await readOptionalDriverLogoutBody(request);
  if (!body) {
    return apiResponse.error("Corps JSON invalide", "BAD_REQUEST", {
      status: 400,
    });
  }
  const header = request.headers.get("authorization");
  const accessToken = header?.startsWith("Bearer ") ? header.slice(7) : null;
  const refreshToken = resolveDriverRefreshToken({
    transport: body.tokenTransport,
    bodyToken: body.refreshToken,
    cookieToken: request.cookies.get(DRIVER_REFRESH_COOKIE)?.value,
  });
  try {
    const result = await revokeDriverSession({ accessToken, refreshToken });
    const response = apiResponse.success(result);
    clearDriverRefreshCookie(response);
    return response;
  } catch (caught) {
    log.error({ err: caught }, "Révocation livreur indisponible");
    const response = apiResponse.error(
      "Déconnexion sécurisée temporairement indisponible",
      "SERVICE_UNAVAILABLE",
      { status: 503 },
    );
    clearDriverRefreshCookie(response);
    return response;
  }
}
