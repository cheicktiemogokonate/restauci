import { getClientIp } from "@/shared/http/client-ip";
import { NextRequest } from "next/server";
import { apiResponse } from "@/app/api/_shared/response";
import { validateBody } from "@/app/api/_shared/validate";
import { createLogger } from "@/infrastructure/logger";
import { checkRateLimit, geoSearchLimiter } from "@/infrastructure/rate-limit";
import { resolveServiceMarketSchema } from "@/modules/service-markets/contracts";
import {
  getServiceMarketCapabilities,
  resolveServiceMarketAtPoint,
} from "@/modules/service-markets/server";

const log = createLogger("v1-client-location-resolve");

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const limited = await checkRateLimit(geoSearchLimiter, ip);
  if (limited) return limited;

  const { data, error } = await validateBody(request, resolveServiceMarketSchema);
  if (error) return error;
  try {
    const resolution = await resolveServiceMarketAtPoint(data);
    if (resolution.status !== "resolved") {
      return apiResponse.success({ resolution, market: null, capabilities: [] });
    }
    const capabilities = await getServiceMarketCapabilities(
      resolution.market.id,
    );
    return apiResponse.success({
      resolution,
      market: resolution.market,
      capabilities,
    });
  } catch (error) {
    log.error({ error }, "Échec de résolution de localisation client");
    return apiResponse.internalError(
      "Impossible de déterminer votre zone pour le moment.",
    );
  }
}
