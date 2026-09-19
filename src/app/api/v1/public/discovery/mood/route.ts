import { getClientIp } from "@/shared/http/client-ip";
import { NextRequest } from "next/server";
import { apiResponse } from "@/app/api/_shared/response";
import { validateBody } from "@/app/api/_shared/validate";
import { buildPaginationMeta } from "@/shared/pagination";
import { createLogger } from "@/infrastructure/logger";
import { checkRateLimit, geoSearchLimiter } from "@/infrastructure/rate-limit";
import { moodSearchSchema } from "@/modules/discovery/contracts";
import { searchMoodDiscovery } from "@/modules/discovery/server";

const log = createLogger("v1-public-discovery-mood");

/**
 * Moteur de recherche Mood & Découverte pour l'application mobile ToutCi.
 * Recherche guidée par l'envie, l'ambiance (mood) et les mots-clés multi-verticales.
 */
export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const limited = await checkRateLimit(geoSearchLimiter, ip);
  if (limited) return limited;

  const { data, error } = await validateBody(request, moodSearchSchema);
  if (error) return error;

  try {
    const result = await searchMoodDiscovery(data);
    return apiResponse.success(
      { items: result.items },
      {
        meta: buildPaginationMeta(result.total, result.page, result.limit),
      },
    );
  } catch (err) {
    log.error({ err }, "Erreur recherche publique mood discovery");
    return apiResponse.internalError();
  }
}
