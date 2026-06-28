import { NextRequest }                    from "next/server";
import { z }                              from "zod";
import { requireRestaurateurSession }     from "@/lib/api/auth-mobile";
import { apiResponse }                    from "@/lib/api/response";
import { validateSearchParams }           from "@/lib/api/validate";
import { checkRateLimit, mobileApiLimiter } from "@/lib/rate-limit";
import { getCommandes }                   from "@/lib/db/queries";
import { buildPaginationMeta, parsePage, parseLimit, PAGINATION }
  from "@/lib/config/pagination";
import { createLogger } from "@/lib/logger";

const log = createLogger("v1-restaurateur-commandes");

const querySchema = z.object({
  statut: z.enum(["recue", "en_preparation", "prete", "servie", "annulee"])
    .optional(),
  page:  z.string().optional(),
  limit: z.string().optional(),
});

export async function GET(
  request: NextRequest
) {
  const { session, error } = await requireRestaurateurSession(request);
  if (error) return error;

  const rl = await checkRateLimit(mobileApiLimiter, session.userId);
  if (rl) return rl;

  const { searchParams } = new URL(request.url);
  const { data: query, error: qError } =
    validateSearchParams(searchParams, querySchema);
  if (qError) return qError;

  const page  = parsePage(query.page);
  const limit = parseLimit(query.limit, PAGINATION.COMMANDES_PAR_PAGE);

  try {
    const result = await getCommandes({
      restaurantId: session.restaurantId,
      statut:       query.statut,
      page,
      limit,
    });

    return apiResponse.success(result.items, {
      meta: buildPaginationMeta(result.total, page, limit),
    });
  } catch (err) {
    log.error({ err }, "Erreur liste commandes mobile");
    return apiResponse.internalError();
  }
}