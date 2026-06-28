import { NextRequest }                from "next/server";
import { requireRestaurateurSession } from "@/lib/api/auth-mobile";
import { apiResponse }                from "@/lib/api/response";
import { validateBody, validateSearchParams } from "@/lib/api/validate";
import { checkRateLimit, mobileApiLimiter }   from "@/lib/rate-limit";
import { getPlats }                   from "@/lib/db/queries";
import { createPlat }                 from "@/lib/db/mutations";
import { platSchema }                 from "@/lib/validations/plat";
import { buildPaginationMeta, parsePage, parseLimit, PAGINATION }
  from "@/lib/config/pagination";
import { z }            from "zod";
import { createLogger } from "@/lib/logger";

const log = createLogger("v1-restaurateur-plats");

const querySchema = z.object({
  categorieId:  z.string().uuid().optional(),
  search:       z.string().max(100).optional(),
  disponible:   z.enum(["true", "false"]).optional(),
  page:         z.string().optional(),
  limit:        z.string().optional(),
});

// GET /api/v1/restaurateur/plats
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
  const limit = parseLimit(query.limit, PAGINATION.PLATS_PAR_PAGE);

  try {
    const result = await getPlats({
      restaurantId: session.restaurantId,
      categorieId:  query.categorieId,
      search:       query.search,
      disponible:   query.disponible === "true"  ? true
                  : query.disponible === "false" ? false
                  : undefined,
      page,
      limit,
    });

    return apiResponse.success(result.items, {
      meta: buildPaginationMeta(result.total, page, limit),
    });
  } catch (err) {
    log.error({ err }, "Erreur liste plats mobile");
    return apiResponse.internalError();
  }
}

// POST /api/v1/restaurateur/plats
export async function POST(
  request: NextRequest
) {
  const { session, error } = await requireRestaurateurSession(request);
  if (error) return error;

  const rl = await checkRateLimit(mobileApiLimiter, session.userId);
  if (rl) return rl;

  const { data, error: vError } = await validateBody(request, platSchema);
  if (vError) return vError;

  try {
    const plat = await createPlat({
      ...data,
      restaurantId: session.restaurantId,
    });

    log.info({ platId: plat.id }, "Plat créé via mobile");
    return apiResponse.created(plat);
  } catch (err) {
    log.error({ err }, "Erreur création plat mobile");
    return apiResponse.internalError();
  }
}