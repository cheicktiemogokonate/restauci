import { NextRequest } from "next/server";
import { apiResponse } from "@/lib/api/response";
import { validateBody } from "@/lib/api/validate";
import { buildPaginationMeta } from "@/lib/config/pagination";
import { createLogger } from "@/lib/logger";
import { checkRateLimit, geoSearchLimiter } from "@/lib/rate-limit";
import { publicResidenceSearchSchema } from "@/modules/residences/contracts";
import { searchPublicResidences } from "@/modules/residences/server";

const log = createLogger("v1-public-residences-search");

/**
 * Recherche canonique Résidences pour le web et les clients natifs.
 * La destination est explicite : aucune position GPS courante n'est requise.
 */
export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "anonymous";
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
