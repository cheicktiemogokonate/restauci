type CacheEntry<T> = {
  data: T;
  cachedAt: number;
};

type CacheRead<T> = {
  data: T;
  isFresh: boolean;
} | null;

const memoryCache = new Map<string, CacheEntry<unknown>>();

/**
 * Cache de navigation limité à l'onglet courant.
 * Il rend une page déjà visitée immédiatement, sans persister de données
 * sensibles ni remplacer la source de vérité serveur.
 */
export function readClientMemoryCache<T>(key: string, maxAgeMs: number): CacheRead<T> {
  const entry = memoryCache.get(key) as CacheEntry<T> | undefined;
  if (!entry) return null;

  return {
    data: entry.data,
    isFresh: Date.now() - entry.cachedAt < maxAgeMs,
  };
}

export function writeClientMemoryCache<T>(key: string, data: T) {
  memoryCache.set(key, { data, cachedAt: Date.now() });
}

export function clearClientMemoryCache() {
  memoryCache.clear();
}
