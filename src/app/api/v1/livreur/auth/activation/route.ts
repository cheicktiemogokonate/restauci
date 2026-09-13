import { NextRequest } from "next/server";
import { applyDriverRefreshTransport } from "@/app/api/_shared/driver-session-cookie";
import { driverTokenTransportSchema } from "@/app/api/_shared/driver-token-transport";
import { deliveryErrorResponse } from "@/app/api/_shared/delivery-response";
import { apiResponse } from "@/app/api/_shared/response";
import { validateBody } from "@/app/api/_shared/validate";
import { createLogger } from "@/infrastructure/logger";
import { activateDriverCredentialsSchema } from "@/modules/deliveries/contracts";
import { activateDriverCredentials } from "@/modules/deliveries/server";

const log = createLogger("v1-driver-activation");
const schema = activateDriverCredentialsSchema
  .extend({ tokenTransport: driverTokenTransportSchema })
  .transform(({ tokenTransport, ...credentials }) => ({
    credentials,
    tokenTransport,
  }));

export async function POST(request: NextRequest) {
  const { data, error } = await validateBody(request, schema);
  if (error) return error;
  try {
    const tokens = await activateDriverCredentials(data.credentials);
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
    if (response) return response;
    log.error({ err: caught }, "Activation livreur impossible");
    return apiResponse.error(
      "Activation temporairement indisponible",
      "SERVICE_UNAVAILABLE",
      { status: 503 },
    );
  }
}
