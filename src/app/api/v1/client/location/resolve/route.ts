import { NextRequest } from "next/server";
import { apiResponse } from "@/lib/api/response";
import { validateBody } from "@/lib/api/validate";
import { createLogger } from "@/lib/logger";
import { checkRateLimit, geoSearchLimiter } from "@/lib/rate-limit";
import { resolveServiceMarketSchema } from "@/modules/service-markets/contracts";
import {
  getServiceMarketCapabilities,
  resolveServiceMarketAtPoint,
} from "@/modules/service-markets/server";

const log = createLogger("v1-client-location-resolve");

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "anonymous";
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
