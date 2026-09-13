import "server-only";

import { and, eq, sql } from "drizzle-orm";
import { db, type DbExecutor, type TransactionExecutor } from "@/infrastructure/db";
import { partnerIdentityVerifications, restaurants } from "@/infrastructure/db/schema";

export function getRestaurantAccessRecordByPartnerAccountId(
  partnerAccountId: string,
) {
  return db.query.restaurants.findFirst({
    where: eq(restaurants.partnerAccountId, partnerAccountId),
    columns: {
      id: true,
      slug: true,
      nom: true,
      actif: true,
      suspendu: true,
      motifRejet: true,
    },
  });
}

export function getPartnerRestaurantRecord(
  partnerAccountId: string,
  executor: DbExecutor = db,
) {
  return executor.query.restaurants.findFirst({
    where: eq(restaurants.partnerAccountId, partnerAccountId),
  });
}

export function getRestaurantOwnerRecordByUserId(
  userId: string,
  executor: DbExecutor = db,
) {
  return executor.query.restaurants.findFirst({
    where: (restaurant, { exists }) =>
      exists(
        sql`SELECT 1 FROM partner_accounts AS owner_account WHERE owner_account.id = ${restaurant.partnerAccountId} AND owner_account.user_id = ${userId}`,
      ),
  });
}

export function getPublicRestaurantRecordBySlug(
  slug: string,
  executor: DbExecutor = db,
) {
  return executor.query.restaurants.findFirst({
    where: eq(restaurants.slug, slug),
    with: {
      partnerAccount: {
        columns: { userId: true },
        with: {
          identityVerification: {
            columns: { status: true, verifiedAt: true },
          },
        },
      },
    },
  });
}

export function listPublicRestaurantSitemapRecords() {
  return db
    .select({ slug: restaurants.slug, updatedAt: restaurants.updatedAt })
    .from(restaurants)
    .where(
      and(
        eq(restaurants.actif, true),
        eq(restaurants.enLigne, true),
        eq(restaurants.suspendu, false),
        sql`EXISTS (
          SELECT 1
          FROM ${partnerIdentityVerifications} AS identity_verification
          WHERE identity_verification.partner_account_id = ${restaurants.partnerAccountId}
            AND identity_verification.status = 'verified'
            AND identity_verification.verified_at IS NOT NULL
        )`,
      ),
    );
}

export function getRestaurantOrderCandidateRecordBySlug(
  slug: string,
  executor: DbExecutor = db,
) {
  return executor.query.restaurants.findFirst({
    where: eq(restaurants.slug, slug),
    columns: { id: true, partnerAccountId: true },
  });
}

export function getRestaurantOrderContextRecord(
  restaurantId: string,
  executor: DbExecutor = db,
) {
  return executor.query.restaurants.findFirst({
    where: eq(restaurants.id, restaurantId),
    columns: {
      id: true,
      partnerAccountId: true,
      actif: true,
      suspendu: true,
      enLigne: true,
      accepteCommandes: true,
      modesCommande: true,
      fraisLivraison: true,
      commandeMinimum: true,
      serviceMarketId: true,
      serviceMarketVersionId: true,
    },
    with: {
      partnerAccount: {
        columns: { userId: true },
        with: {
          identityVerification: {
            columns: { status: true, verifiedAt: true },
          },
        },
      },
    },
  });
}

export function getRestaurantOrderDisplayRecord(
  restaurantId: string,
  executor: DbExecutor = db,
) {
  return executor.query.restaurants.findFirst({
    where: eq(restaurants.id, restaurantId),
    columns: { id: true, nom: true, logoUrl: true },
  });
}

export function lockRestaurantOrderRecord(
  restaurantId: string,
  tx: TransactionExecutor,
) {
  return tx.execute(
    sql`SELECT id FROM ${restaurants} WHERE id = ${restaurantId} FOR SHARE`,
  );
}
