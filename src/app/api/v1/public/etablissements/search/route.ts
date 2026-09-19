import { getClientIp } from "@/shared/http/client-ip";
import { NextRequest } from "next/server";
import { apiResponse } from "@/app/api/_shared/response";
import { validateBody } from "@/app/api/_shared/validate";
import { buildPaginationMeta } from "@/shared/pagination";
import { createLogger } from "@/infrastructure/logger";
import { checkRateLimit, geoSearchLimiter } from "@/infrastructure/rate-limit";
import { etablissementSearchSchema } from "@/modules/discovery/contracts";
import { searchEtablissements } from "@/modules/discovery/server";

const log = createLogger("v1-public-etablissements-search");

/**
 * Façade publique agnostique pour la découverte sur la Carte ToutCi.
 * Unifie restaurants et résidences autour de la position de l'utilisateur.
 */
export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const limited = await checkRateLimit(geoSearchLimiter, ip);
  if (limited) return limited;

  const { data, error } = await validateBody(request, etablissementSearchSchema);
  if (error) return error;

  try {
    const result = await searchEtablissements(data);
    return apiResponse.success(
      { items: result.items },
      {
        meta: buildPaginationMeta(result.total, result.page, result.limit),
      },
    );
  } catch (err) {
    log.error({ err }, "Erreur recherche publique établissements");
    return apiResponse.internalError();
  }
}
