import { NextRequest }                    from "next/server";
import { z }                              from "zod";
import { requireRestaurateurSession }     from "@/app/api/_shared/auth-mobile";
import { apiResponse }                    from "@/app/api/_shared/response";
import { validateSearchParams }           from "@/app/api/_shared/validate";
import { checkRateLimit, mobileApiLimiter } from "@/infrastructure/rate-limit";
import { listRestaurantOrders } from "@/modules/orders/server";
import { buildPaginationMeta, parsePage, parseLimit, PAGINATION }
  from "@/shared/pagination";
import { createLogger } from "@/infrastructure/logger";

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
    const result = await listRestaurantOrders(session.restaurantId, {
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
