import { getClientIp } from "@/shared/http/client-ip";
import { NextRequest } from "next/server";
import { apiResponse } from "@/app/api/_shared/response";
import { validateBody } from "@/app/api/_shared/validate";
import { buildPaginationMeta } from "@/shared/pagination";
import { createLogger } from "@/infrastructure/logger";
import { checkRateLimit, geoSearchLimiter } from "@/infrastructure/rate-limit";
import { publicResidenceSearchSchema } from "@/modules/residences/contracts";
import { searchPublicResidences } from "@/modules/discovery/server";

const log = createLogger("v1-public-residences-search");

/**
 * Recherche canonique Résidences pour le web et les clients natifs.
 * La destination est explicite : aucune position GPS courante n'est requise.
 */
export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const limited = await checkRateLimit(geoSearchLimiter, ip);
  if (limited) return limited;

  const { data, error } = await validateBody(
    request,
    publicResidenceSearchSchema,
  );
  if (error) return error;

  try {
    const result = await searchPublicResidences(data);
    return apiResponse.success(
      { items: result.items },
      {
        meta: buildPaginationMeta(result.total, result.page, result.limit),
      },
    );
  } catch (caught) {
    log.error({ caught }, "Recherche Résidences impossible");
    return apiResponse.internalError();
  }
}
