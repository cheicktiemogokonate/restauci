import { apiResponse } from "@/lib/api/response";
import { validateSearchParams } from "@/lib/api/validate";
import { TTL, cacheKey, withCache } from "@/lib/cache";
import {
  buildPaginationMeta,
  parseLimit,
  parsePage,
} from "@/lib/config/pagination";
import { db } from "@/lib/db";
import { restaurants } from "@/lib/db/schema";
import { trierParProximite } from "@/lib/geo";
import { createLogger } from "@/lib/logger";
import {
  checkRateLimit,
  clientApiLimiter,
  geoSearchLimiter,
} from "@/lib/rate-limit";
import { and, eq } from "drizzle-orm";
import { NextRequest } from "next/server";
import { z } from "zod";

const log = createLogger("v1-client-restaurants");

const querySchema = z.object({
  // Localisation du client (pour le tri par proximité)
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  // Rayon de recherche en km (défaut : 10km)
  rayon: z.coerce.number().min(0.5).max(50).default(10),
  // Filtres
  search: z.string().max(100).optional(),
  cuisine: z.string().max(100).optional(),
  modeCommande: z.enum(["sur_place", "livraison", "emporter"]).optional(),
  // Pagination
  page: z.string().optional(),
  limit: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "anonymous";

  // Rate limit différent si recherche géo (plus coûteuse)
  const { searchParams } = new URL(req.url);
  const hasGeo = searchParams.has("lat") && searchParams.has("lng");
  const limiter = hasGeo ? geoSearchLimiter : clientApiLimiter;
  const rl = await checkRateLimit(limiter, ip);
  if (rl) return rl;

  const { data: query, error } = validateSearchParams(
    searchParams,
    querySchema,
  );
  if (error) return error;

  const page = parsePage(query.page);
  const limit = parseLimit(query.limit, 20);

  try {
    // Récupérer tous les restaurants actifs (cachés 15 min)
    const tousLesRestaurants = await withCache(
      cacheKey.restaurantsPublicAll(),
      TTL.RESTAURANT_PUBLIC,
      async () =>
        db
          .select({
            id: restaurants.id,
            nom: restaurants.nom,
            slug: restaurants.slug,
            description: restaurants.description,
            logoUrl: restaurants.logoUrl,
            banniereUrl: restaurants.banniereUrl,
            adresse: restaurants.adresse,
            ville: restaurants.ville,
            latitude: restaurants.latitude,
            longitude: restaurants.longitude,
            cuisines: restaurants.cuisines,
            modesCommande: restaurants.modesCommande,
            fraisLivraison: restaurants.fraisLivraison,
            commandeMinimum: restaurants.commandeMinimum,
            tempsPreparationMoyen: restaurants.tempsPreparationMoyen,
            noteMoyenne: restaurants.noteMoyenne,
            nombreAvis: restaurants.nombreAvis,
            enLigne: restaurants.enLigne,
            accepteCommandes: restaurants.accepteCommandes,
          })
          .from(restaurants)
          .where(and(eq(restaurants.actif, true))),
    );

    // Appliquer les filtres côté application (les données sont cachées)
    let filtres = tousLesRestaurants;

    // Filtre recherche texte
    if (query.search) {
      const s = query.search.toLowerCase();
      filtres = filtres.filter(
        (r) =>
          r.nom.toLowerCase().includes(s) ||
          r.description?.toLowerCase().includes(s) ||
          r.cuisines?.some((c) => c.toLowerCase().includes(s)),
      );
    }

    // Filtre type de cuisine
    if (query.cuisine) {
      const c = query.cuisine.toLowerCase();
      filtres = filtres.filter((r) =>
        r.cuisines?.some((cuisine) => cuisine.toLowerCase().includes(c)),
      );
    }

    // Filtre mode de commande
    if (query.modeCommande) {
      filtres = filtres.filter((r) =>
        r.modesCommande?.includes(query.modeCommande!),
      );
    }

    // Tri par proximité et filtre par rayon si coordonnées fournies
    let resultats: typeof filtres & { distanceKm?: number }[] = filtres;

    if (query.lat !== undefined && query.lng !== undefined) {
      const avecDistance = trierParProximite(filtres, {
        lat: query.lat,
        lng: query.lng,
      });

      // Filtrer par rayon
      resultats = avecDistance.filter((r) => r.distanceKm <= query.rayon);
    }

    // Pagination manuelle (données déjà en mémoire depuis le cache)
    const total = resultats.length;
    const offset = (page - 1) * limit;
    const items = resultats.slice(offset, offset + limit);

    return apiResponse.success(items, {
      meta: buildPaginationMeta(total, page, limit),
    });
  } catch (err) {
    log.error({ err }, "Erreur liste restaurants client");
    return apiResponse.internalError();
  }
}
