import { apiResponse } from "@/lib/api/response";
import { TTL, withCache } from "@/lib/cache";
import { db } from "@/lib/db";
import { categories, plats, restaurants } from "@/lib/db/schema";
import { createLogger } from "@/lib/logger";
import { apiLimiter, checkRateLimit } from "@/lib/rate-limit";
import { and, asc, eq } from "drizzle-orm";
import { NextRequest } from "next/server";

const log = createLogger("v1-public-menu");

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0] ?? "anonymous";
  const rl = await checkRateLimit(apiLimiter, ip);
  if (rl) return rl;

  try {
    // Le menu public est très cacheable (15 min)
    const menu = await withCache(
      `restauci:public:menu:${slug}`,
      TTL.PLATS,
      async () => {
        // Trouver le restaurant
        const [restaurant] = await db
          .select({ id: restaurants.id })
          .from(restaurants)
          .where(and(eq(restaurants.slug, slug), eq(restaurants.actif, true)))
          .limit(1);

        if (!restaurant) return null;

        // Charger les catégories et plats disponibles
        const [cats, items] = await Promise.all([
          db
            .select()
            .from(categories)
            .where(eq(categories.restaurantId, restaurant.id))
            .orderBy(asc(categories.ordre)),

          db
            .select()
            .from(plats)
            .where(
              and(
                eq(plats.restaurantId, restaurant.id),
                eq(plats.disponible, true),
              ),
            )
            .orderBy(asc(plats.ordre)),
        ]);

        // Grouper les plats par catégorie
        return cats.map((cat) => ({
          ...cat,
          plats: items.filter((p) => p.categorieId === cat.id),
        }));
      },
    );

    if (!menu) return apiResponse.notFound("Restaurant");

    return apiResponse.success(menu);
  } catch (err) {
    log.error({ err, slug }, "Erreur menu public");
    return apiResponse.internalError();
  }
}
