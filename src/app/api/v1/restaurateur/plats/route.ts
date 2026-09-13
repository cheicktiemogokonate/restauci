import { NextRequest }                from "next/server";
import { requireRestaurateurSession } from "@/app/api/_shared/auth-mobile";
import { apiResponse }                from "@/app/api/_shared/response";
import { validateBody, validateSearchParams } from "@/app/api/_shared/validate";
import { checkRateLimit, mobileApiLimiter }   from "@/infrastructure/rate-limit";
import { createMenuDish, getMenuManagementWorkspace } from "@/modules/menu/server";
import { MenuDomainError } from "@/modules/menu/model";
import { menuDishPayloadSchema } from "@/modules/menu/contracts";
import { buildPaginationMeta, parsePage, parseLimit, PAGINATION }
  from "@/shared/pagination";
import { z }            from "zod";
import { createLogger } from "@/infrastructure/logger";

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
    const result = await getMenuManagementWorkspace({
      restaurantId: session.restaurantId,
      categoryId:  query.categorieId,
      search:       query.search,
      disponible:   query.disponible === "true"  ? true
                  : query.disponible === "false" ? false
                  : undefined,
      page,
      limit,
    });

    return apiResponse.success(result.dishes, {
      meta: buildPaginationMeta(result.totalDishes, page, limit),
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

  const { data, error: vError } = await validateBody(request, menuDishPayloadSchema);
  if (vError) return vError;

  try {
    const plat = await createMenuDish({
      restaurantId: session.restaurantId,
      ownerUserId: session.userId,
      nom: data.nom,
      description: data.description,
      prix: data.prix,
      photoUrl: data.image,
      photoAssetId: data.imageAssetId,
      categorieId: data.categorieId,
      newCategorieName: data.categorieName,
      disponible: data.disponible,
      ordre: 0,
      tags: data.tags,
      allergenes: data.allergenes,
    });

    log.info({ platId: plat.id }, "Plat créé via mobile");
    return apiResponse.created(plat);
  } catch (err) {
    log.error({ err }, "Erreur création plat mobile");
    if (err instanceof MenuDomainError) {
      return apiResponse.error(err.message, "BAD_REQUEST", { status: 400 });
    }
    return apiResponse.internalError();
  }
}
