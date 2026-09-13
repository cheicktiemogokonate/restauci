import "server-only";

import { sql } from "drizzle-orm";
import { db } from "@/infrastructure/db";
import type { SubscriptionPlanCode } from "@/modules/subscriptions/model";
import type {
  PublicResidenceSearchInput,
  ResidenceDiscoveryEligibleRecord,
  ResidencePhotoDTO,
} from "../contracts";

type SearchRow = {
  id: string;
  partner_account_id: string;
  plan_code: SubscriptionPlanCode;
  slug: string;
  title: string;
  description: string;
  price_per_night_fcfa: number | string;
  max_guests: number | string;
  city: string;
  country: string;
  first_published_at: Date | string;
  has_provider_account: boolean;
  photos: ResidencePhotoDTO[] | string | null;
};

function rowsFromExecuteResult<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  if (
    typeof result === "object" &&
    result !== null &&
    "rows" in result &&
    Array.isArray(result.rows)
  ) {
    return result.rows as T[];
  }
  return [];
}

function parsePhotos(value: SearchRow["photos"]): ResidencePhotoDTO[] {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as ResidencePhotoDTO[]) : [];
  }
  return [];
}

export async function searchPublicResidenceRecords(
  input: PublicResidenceSearchInput,
): Promise<ResidenceDiscoveryEligibleRecord[]> {
  const destination = input.destination?.trim() || null;
  const checkIn = input.checkIn ?? null;
  const checkOut = input.checkOut ?? null;
  const guests = input.guests ?? null;
  const result = await db.execute(sql`
    WITH effective_subscription AS (
      SELECT
        account.id AS partner_account_id,
        active_period.id AS period_id,
        COALESCE(active_period.plan_code, 'decouverte') AS plan_code
      FROM partner_accounts AS account
      LEFT JOIN LATERAL (
        SELECT period.id, period.plan_code
        FROM subscription_periods AS period
        WHERE period.partner_account_id = account.id
          AND period.statut = 'active'
          AND period.plan_code <> 'decouverte'
          AND period.date_debut <= NOW()
          AND period.date_echeance > NOW()
        ORDER BY period.date_debut DESC
        LIMIT 1
      ) AS active_period ON TRUE
      WHERE account.activity_type = 'residence'
    ),
    base_public AS (
      SELECT
        residence.*,
        subscription.plan_code,
        CASE
          WHEN subscription.period_id IS NOT NULL THEN (
            SELECT period_limit.max_count
            FROM subscription_period_limits AS period_limit
            WHERE period_limit.subscription_period_id = subscription.period_id
              AND period_limit.activity_type = 'residence'
              AND period_limit.resource_type = 'residence'
          )
          ELSE (
            SELECT plan_limit.max_count
            FROM subscription_plan_limits AS plan_limit
            INNER JOIN subscription_plans AS plan ON plan.id = plan_limit.plan_id
            WHERE plan.code = subscription.plan_code
              AND plan_limit.activity_type = 'residence'
              AND plan_limit.resource_type = 'residence'
          )
        END AS quota_limit
      FROM residences AS residence
      INNER JOIN effective_subscription AS subscription
        ON subscription.partner_account_id = residence.partner_account_id
      INNER JOIN partner_identity_verifications AS identity
        ON identity.partner_account_id = residence.partner_account_id
       AND identity.status = 'verified'
      WHERE residence.publication_intent = TRUE
        AND residence.publication_enabled_at IS NOT NULL
        AND residence.first_published_at IS NOT NULL
        AND residence.actif = TRUE
        AND residence.suspendu = FALSE
        AND residence.archived_at IS NULL
        AND residence.latitude IS NOT NULL
        AND residence.longitude IS NOT NULL
        AND (
          SELECT COUNT(*)
          FROM service_markets AS market
          INNER JOIN service_market_versions AS version
            ON version.id = market.active_version_id
          WHERE market.status = 'published'
            AND version.published_at IS NOT NULL
            AND version.retired_at IS NULL
            AND ST_Covers(
              version.geometry,
              ST_SetSRID(ST_MakePoint(residence.longitude, residence.latitude), 4326)
            )
        ) = 1
        AND EXISTS (
          SELECT 1
          FROM service_markets AS market
          INNER JOIN service_market_versions AS version
            ON version.id = market.active_version_id
          INNER JOIN service_market_capabilities AS capability
            ON capability.service_market_id = market.id
           AND capability.activity_type = 'residence'
           AND capability.status = 'active'
          WHERE market.status = 'published'
            AND version.published_at IS NOT NULL
            AND version.retired_at IS NULL
            AND ST_Covers(
              version.geometry,
              ST_SetSRID(ST_MakePoint(residence.longitude, residence.latitude), 4326)
            )
        )
    ),
    quota_ranked AS (
      SELECT
        base_public.*,
        ROW_NUMBER() OVER (
          PARTITION BY base_public.partner_account_id
          ORDER BY base_public.first_published_at, base_public.created_at, base_public.id
        ) AS quota_rank
      FROM base_public
    )
    SELECT
      residence.id,
      residence.partner_account_id,
      residence.plan_code,
      residence.slug,
      residence.title,
      residence.description,
      residence.price_per_night_fcfa,
      residence.max_guests,
      residence.city,
      residence.country,
      residence.first_published_at,
      EXISTS (
        SELECT 1
        FROM payment_provider_accounts AS provider_account
        WHERE provider_account.partner_account_id = residence.partner_account_id
          AND provider_account.provider = 'paystack'
          AND provider_account.status = 'active'
      ) AS has_provider_account,
      COALESCE((
        SELECT json_agg(
          json_build_object(
            'id', image.id,
            'url', image.url,
            'altText', image.alt_text,
            'sortOrder', image.sort_order
          )
          ORDER BY image.sort_order, image.id
        )
        FROM residence_images AS image
        WHERE image.residence_id = residence.id
      ), '[]'::json) AS photos
    FROM quota_ranked AS residence
    WHERE (residence.quota_limit IS NULL OR residence.quota_rank <= residence.quota_limit)
      AND (
        ${destination}::text IS NULL
        OR residence.city ILIKE '%' || ${destination}::text || '%'
        OR residence.country ILIKE '%' || ${destination}::text || '%'
        OR residence.title ILIKE '%' || ${destination}::text || '%'
      )
      AND (${guests}::integer IS NULL OR residence.max_guests >= ${guests}::integer)
      AND (
        ${checkIn}::date IS NULL
        OR NOT EXISTS (
          SELECT 1
          FROM residence_reservations AS reservation
          WHERE reservation.residence_id = residence.id
            AND reservation.status <> 'annulee'
            AND reservation.check_in < ${checkOut}::date
            AND reservation.check_out > ${checkIn}::date
        )
      )
      AND (
        ${checkIn}::date IS NULL
        OR NOT EXISTS (
          SELECT 1
          FROM residence_unavailable_periods AS unavailable
          WHERE unavailable.residence_id = residence.id
            AND unavailable.check_in < ${checkOut}::date
            AND unavailable.check_out > ${checkIn}::date
        )
      )
    ORDER BY
      CASE
        WHEN ${destination}::text IS NULL THEN 0
        WHEN lower(residence.city) = lower(${destination}::text) THEN 0
        WHEN residence.city ILIKE '%' || ${destination}::text || '%' THEN 1
        WHEN residence.title ILIKE '%' || ${destination}::text || '%' THEN 2
        ELSE 3
      END,
      residence.first_published_at DESC,
      residence.id
  `);

  return rowsFromExecuteResult<SearchRow>(result).map((row, organicRank) => ({
    item: {
      id: row.id,
      slug: row.slug,
      title: row.title,
      description: row.description,
      pricePerNightFcfa: Number(row.price_per_night_fcfa),
      maxGuests: Number(row.max_guests),
      city: row.city,
      country: row.country,
      firstPublishedAt: new Date(row.first_published_at).toISOString(),
      photos: parsePhotos(row.photos),
      bookability: {
        isBookable: row.has_provider_account,
        blockers: row.has_provider_account ? [] : ["provider_account_missing"],
      },
    },
    candidate: {
      resourceId: row.id,
      partnerAccountId: row.partner_account_id,
      planCode: row.plan_code,
      organicRank,
    },
  }));
}
