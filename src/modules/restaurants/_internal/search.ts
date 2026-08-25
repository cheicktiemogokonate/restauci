import "server-only";

import { and, asc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/infrastructure/db";
import { restaurants } from "@/lib/db/schema";
import type { DiscoveryCandidate } from "@/modules/discovery/model";
import type { SubscriptionPlanCode } from "@/modules/subscriptions/model";
import type { RestaurantSearchInput, RestaurantSearchItemDTO } from "../contracts";

export interface RestaurantDiscoveryRecord {
  item: Omit<
    RestaurantSearchItemDTO,
    "placement" | "partnerBadgeEnabled" | "discoveryToken"
  >;
  candidate: DiscoveryCandidate;
}

function buildSearchConditions(input: RestaurantSearchInput, serviceMarketId?: string) {
  const conditions: SQL[] = [
    eq(restaurants.actif, true),
    eq(restaurants.suspendu, false),
  ];
  if (serviceMarketId) conditions.unshift(eq(restaurants.serviceMarketId, serviceMarketId));

  const search = input.search?.trim();
  if (search) {
    const pattern = `%${search}%`;
    conditions.push(
      or(
        ilike(restaurants.nom, pattern),
        ilike(restaurants.description, pattern),
        sql`EXISTS (
          SELECT 1
          FROM unnest(COALESCE(${restaurants.cuisines}, ARRAY[]::text[])) AS cuisine
          WHERE cuisine ILIKE ${pattern}
        )`,
      )!,
    );
  } else if (!serviceMarketId) {
    conditions.push(sql`ST_DWithin(
      ST_SetSRID(ST_MakePoint(${restaurants.longitude}, ${restaurants.latitude}), 4326)::geography,
      ST_SetSRID(ST_MakePoint(${input.currentLocation.lng}, ${input.currentLocation.lat}), 4326)::geography,
      ${input.legacyRadiusKm * 1_000}
    )`);
  }
  if (input.cuisine) {
    const cuisinePattern = `%${input.cuisine.trim()}%`;
    conditions.push(sql`EXISTS (
      SELECT 1
      FROM unnest(COALESCE(${restaurants.cuisines}, ARRAY[]::text[])) AS cuisine
      WHERE cuisine ILIKE ${cuisinePattern}
    )`);
  }
  if (input.modeCommande) {
    conditions.push(sql`${input.modeCommande} = ANY(${restaurants.modesCommande})`);
  }
  return conditions;
}

async function searchVisibleRestaurantCandidates(
  input: RestaurantSearchInput,
  serviceMarketId?: string,
): Promise<RestaurantDiscoveryRecord[]> {
  const distanceMeters = sql<number>`ST_DistanceSphere(
    ST_SetSRID(ST_MakePoint(${restaurants.longitude}, ${restaurants.latitude}), 4326),
    ST_SetSRID(ST_MakePoint(${input.currentLocation.lng}, ${input.currentLocation.lat}), 4326)
  )`;
  const effectivePlanCode = sql<SubscriptionPlanCode>`COALESCE((
    SELECT period.plan_code
    FROM subscription_periods AS period
    WHERE period.partner_account_id = ${restaurants.partnerAccountId}
      AND period.statut = 'active'
      AND period.plan_code <> 'decouverte'
      AND period.date_debut <= NOW()
      AND period.date_echeance > NOW()
    ORDER BY period.date_debut DESC
    LIMIT 1
  ), 'decouverte')`;

  const rows = await db
    .select({
      id: restaurants.id,
      partnerAccountId: restaurants.partnerAccountId,
      planCode: effectivePlanCode,
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
      distanceMeters,
    })
    .from(restaurants)
    .where(and(...buildSearchConditions(input, serviceMarketId)))
    .orderBy(asc(distanceMeters), asc(restaurants.nom), asc(restaurants.id));

  return rows.map(({ partnerAccountId, planCode, distanceMeters: meters, ...row }, organicRank) => ({
    item: {
      ...row,
      distanceKm: Math.round((Number(meters) / 1_000) * 10) / 10,
    },
    candidate: {
      resourceId: row.id,
      partnerAccountId,
      planCode,
      organicRank,
    },
  }));
}

export function searchVisibleRestaurantsInMarket(
  serviceMarketId: string,
  input: RestaurantSearchInput,
) {
  return searchVisibleRestaurantCandidates(input, serviceMarketId);
}

export function searchVisibleRestaurantsLegacy(input: RestaurantSearchInput) {
  return searchVisibleRestaurantCandidates(input);
}
