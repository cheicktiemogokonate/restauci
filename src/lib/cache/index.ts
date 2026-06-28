import { redis } from "./redis";
import { cacheLogger } from "@/lib/loggers";

export const TTL = {
  RESTAURANT:   60 * 60,
  CATEGORIES:   60 * 30,
  PLATS:        60 * 15,
  COMMANDES:    60 * 2,
  STATS:        60 * 5,
  NOTIFICATIONS: 60,
  RESTAURANT_PUBLIC: 60 * 60 * 24,
} as const;

export const cacheKey = {
  restaurantByUser: (userId: string) => `restauci:restaurant:user:${userId}`,
  restaurant:       (id: string)    => `restauci:restaurant:${id}`,
  restaurantPublic: (slug: string)  => `restauci:restaurant:public:${slug}`,
  restaurantsPublicAll: ()          => `restauci:restaurants:public:all`,
  categories:       (restaurantId: string) =>
    `restauci:categories:${restaurantId}`,
  creneauxRestaurant: (restaurantId: string) =>
    `restauci:creneaux:${restaurantId}`,
  plats: (
    restaurantId: string,
    page: number,
    categorieId?: string | null,
    disponible?: boolean | null,
    search?: string
  ) =>
    `restauci:plats:${restaurantId}:${page}:${categorieId ?? "all"}:${
      disponible === undefined ? "all" : disponible
    }:${search ?? "all"}`,
  plat:             (id: string)    => `restauci:plat:${id}`,
  topPlats: (
    restaurantId: string,
    limit: number
  ) =>
    `restauci:top-plats:${restaurantId}:${limit}`,
  commandes: (
    restaurantId: string,
    page: number,
    statut?: string,
    modeCommande?: string,
    dateDebut?: string,
    dateFin?: string,
    search?: string
  ) =>
    `restauci:commandes:${restaurantId}:${page}:${statut ?? "all"}:${
      modeCommande ?? "all"
    }:${dateDebut ?? "all"}:${dateFin ?? "all"}:${search ?? "all"}`,
  stats:            (restaurantId: string) => `restauci:stats:${restaurantId}`,
  notifications:    (userId: string) => `restauci:notifications:${userId}`,
} as const;

export async function withCache<T>(
  key: string,
  ttl: number,
  fetcher: () => Promise<T>
): Promise<T> {
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
  if (keys.length === 0) return;

  try {
    await redis.del(...keys);
  } catch (error) {
    cacheLogger.warn({ keys, error: error instanceof Error ? error.message : "Unknown error" }, "Failed to invalidate cache");
  }
}

export async function invalidateCacheByPattern(pattern: string): Promise<void> {
  if (!pattern) return;

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
  const keys = [
    cacheKey.restaurant(restaurantId),
    cacheKey.categories(restaurantId),
    cacheKey.creneauxRestaurant(restaurantId),
    cacheKey.stats(restaurantId),
    cacheKey.restaurantsPublicAll()
  ];
  if (slug) {
    keys.push(cacheKey.restaurantPublic(slug));
  }

  await invalidateCache(...keys);

  await invalidateCacheByPattern(`restauci:plats:${restaurantId}:*`);
  await invalidateCacheByPattern(`restauci:commandes:${restaurantId}:*`);
  await invalidateCacheByPattern(`restauci:top-plats:${restaurantId}:*`);
}
