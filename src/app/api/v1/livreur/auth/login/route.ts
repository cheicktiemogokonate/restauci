import { NextRequest } from "next/server";
import { z } from "zod";
import { getClientIp } from "@/lib/api/client-ip";
import { applyDriverRefreshTransport } from "@/lib/api/driver-session-cookie";
import { driverTokenTransportSchema } from "@/lib/api/driver-token-transport";
import { deliveryErrorResponse } from "@/lib/api/delivery-response";
import { apiResponse } from "@/lib/api/response";
import { validateBody } from "@/lib/api/validate";
import { createLogger } from "@/lib/logger";
import {
  authAccountLimiter,
  checkRateLimit,
  mobileAuthLimiter,
} from "@/lib/rate-limit";
import { securityIdentifier } from "@/lib/security/identifier";
import { driverLoginSchema } from "@/modules/deliveries/contracts";
import { authenticateDriver } from "@/modules/deliveries/server";

const log = createLogger("v1-driver-login");
const schema = z
  .object({
    ...driverLoginSchema.shape,
    tokenTransport: driverTokenTransportSchema,
  })
  .strict()
  .transform(({ tokenTransport, ...credentials }) => ({
    credentials,
    tokenTransport,
  }));

export async function POST(request: NextRequest) {
  const bypass =
    process.env.NODE_ENV !== "production" && process.env.E2E_TEST === "true";
  if (!bypass) {
    const limited = await checkRateLimit(mobileAuthLimiter, getClientIp(request));
    if (limited) return limited;
  }
  const { data, error } = await validateBody(request, schema);
  if (error) return error;
  if (!bypass) {
    const account = securityIdentifier(
      "driver-login",
      data.credentials.loginId,
    );
    const limited = await checkRateLimit(authAccountLimiter, account);
    if (limited) return limited;
  }
  try {
    const result = await authenticateDriver(data.credentials);
    if (result.kind === "activation_required") {
      return apiResponse.success(result);
    }
    const response = apiResponse.success({
      kind: result.kind,
      driver: result.driver,
      tokens: {
        accessToken: result.tokens.accessToken,
        ...(data.tokenTransport === "json"
          ? { refreshToken: result.tokens.refreshToken }
          : {}),
        expiresIn: result.tokens.accessExpiresIn,
      },
    });
    applyDriverRefreshTransport(response, {
      transport: data.tokenTransport,
      token: result.tokens.refreshToken,
      maxAge: result.tokens.refreshMaxAge,
    });
    return response;
  } catch (caught) {
    const response = deliveryErrorResponse(caught);
    if (response) return response;
    log.error({ err: caught }, "Connexion livreur impossible");
    return apiResponse.internalError();
  }
}
