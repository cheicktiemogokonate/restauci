import { redis } from "./redis";
import { env } from "@/lib/env";
import { cacheLogger } from "@/lib/loggers";
import { db } from "@/lib/db";
import { restaurants } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
export { cacheKey, TTL } from "./keys";
import { cacheKey } from "./keys";

export async function withCache<T>(
  key: string,
  ttl: number,
  fetcher: () => Promise<T>
): Promise<T> {
  if (!env.DATA_CACHE_ENABLED) {
    return fetcher();
  }

  try {
    const cached = await redis.get<T>(key);
    if (cached !== null) {
      return cached;
    }
  } catch (error) {
    cacheLogger.warn({ key, error: error instanceof Error ? error.message : "Unknown error" }, "Redis unavailable, bypassing cache");
  }

  const data = await fetcher();

  try {
    await redis.setex(key, ttl, JSON.stringify(data));
  } catch (error) {
    cacheLogger.warn({ key, error: error instanceof Error ? error.message : "Unknown error" }, "Failed to set cache");
  }

  return data;
}

export async function invalidateCache(...keys: string[]): Promise<void> {
  if (!env.DATA_CACHE_ENABLED || keys.length === 0) return;

  try {
    await redis.del(...keys);
  } catch (error) {
    cacheLogger.warn({ keys, error: error instanceof Error ? error.message : "Unknown error" }, "Failed to invalidate cache");
  }
}

export async function invalidateCacheByPattern(pattern: string): Promise<void> {
  if (!env.DATA_CACHE_ENABLED || !pattern) return;

  try {
    let cursor = "0";
    const keys: string[] = [];

    do {
      const [nextCursor, batchKeys] = await redis.scan(cursor, { match: pattern, count: 100 });
      cursor = nextCursor;
      keys.push(...batchKeys);
    } while (cursor !== "0");

    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch (error) {
    cacheLogger.warn({ pattern, error: error instanceof Error ? error.message : "Unknown error" }, "Failed to invalidate cache by pattern");
  }
}

export async function invalidateRestaurantCache(
  restaurantId: string,
  slug?: string
): Promise<void> {
  const resolvedSlug = slug ?? (await db.query.restaurants.findFirst({
    where: eq(restaurants.id, restaurantId),
    columns: { slug: true },
  }))?.slug;
  const keys = [
    cacheKey.restaurant(restaurantId),
    cacheKey.categories(restaurantId),
    cacheKey.creneauxRestaurant(restaurantId),
    cacheKey.stats(restaurantId),
    cacheKey.dashboardModes(restaurantId),
    cacheKey.restaurantsPublicAll()
  ];
  if (resolvedSlug) {
    keys.push(
      cacheKey.restaurantPublic(resolvedSlug),
      cacheKey.restaurantPublicMenu(resolvedSlug),
    );
  }

  await invalidateCache(...keys);

  await invalidateCacheByPattern(`restauci:plats:${restaurantId}:*`);
  await invalidateCacheByPattern(`restauci:commandes:${restaurantId}:*`);
  await invalidateCacheByPattern(`restauci:top-plats:${restaurantId}:*`);
  await invalidateCacheByPattern(`restauci:dashboard:daily:${restaurantId}:*`);
  await invalidateCacheByPattern(cacheKey.restaurantsPublicMarketsPattern());

  // Redis porte les projections de données ; Next porte les arbres de pages.
  // Les deux niveaux sont invalidés par la même entrée canonique.
  revalidatePath("/client");
  if (resolvedSlug) revalidatePath(`/restaurant/${resolvedSlug}`);
}
